"""Parse AFMAN 24-604 Attachment 4 (Tables A4.1, A4.2, A4.3) from the PDF into the app's JSON files.

Usage (from the repo root, in an environment with pdfplumber installed):
  pip install pdfplumber
  python scripts/parse_afman_a4.py "path/to/Attachment 4 Excerpt, AFMAN 24-604 2025.pdf"

Writes:
  src/data-file/item-table.json            Table A4.1 (one row per packing group)
  src/data-file/special-provisions.json    Table A4.2
  src/data-file/hazardous_substances.json  Table A4.3

The table layout is read from word positions and the table's cell rectangles, so
rows that wrap over several lines and multi-packing-group entries stay together.
"""

import json
import re
import sys
from pathlib import Path

import pdfplumber

OUT = Path(__file__).resolve().parent.parent / "src" / "data-file"
STAR = ""  # Wingdings star used for "technical name required"

# Table A4.1 column x-ranges (points), identical on every page
A41_COLS = [
    ("TN", 0, 72),
    ("UN", 72, 114),
    ("PSN", 114, 302),
    ("Class", 302, 360),
    ("SubClass", 360, 428),
    ("PG", 428, 450),
    ("SpecProv", 450, 509),
    ("PackingPara", 509, 612),
]
ROMAN = {"I", "II", "III"}

# Text the PDF stores letter-by-letter, so word spacing can't be recovered automatically
KNOWN_TEXT_FIXES = {
    "2 , 2 ’ - A z o d i ( i s o b u t y r o n i t r i l e ) a s a w a t e r b a s e p a s t e":
        "2,2’-Azodi(isobutyronitrile) as a water base paste",
}


def clean(s):
    s = s.replace(STAR, "✭").replace(" ", " ")
    s = re.sub(r"\s+", " ", s).strip()
    # rejoin words broken across lines after a hyphen ("SELF- HEATING", "2-methyl- 4-chloro")
    return re.sub(r"(?<=[\w\]\)])- (?=[\w\[(])", "-", s)


def cell_rows(page, x0, x1, top_min):
    """Row bands between the thin ruling rectangles that separate rows in one column."""
    tops = sorted(
        r["top"] for r in page.rects
        if r["height"] < 1.5 and abs(r["x0"] - x0) < 2 and abs(r["x1"] - x1) < 2 and r["top"] >= top_min - 2
    )
    rules = []
    for t in tops:
        if not rules or t - rules[-1] > 1.5:
            rules.append(t)
    # the header's bottom edge isn't always drawn as its own rule; start the first row there
    if not rules or rules[0] - top_min > 4:
        rules.insert(0, top_min)
    return list(zip(rules, rules[1:]))


def lines_in(words, x0, x1):
    """Group words in an x-range into lines: [(top, text)]."""
    sel = sorted((w for w in words if x0 <= w["x0"] < x1), key=lambda w: w["top"])
    lines = []
    for w in sel:
        if lines and w["top"] - lines[-1][0] < 3:
            lines[-1][1].append(w)
        else:
            lines.append([w["top"], [w]])
    out = []
    for t, ws in lines:
        text = clean(" ".join(w["text"] for w in sorted(ws, key=lambda w: w["x0"])))
        if text:
            out.append((t, text))
    return out


def group_by_anchor(lines, anchors):
    """Assign each line to the last anchor (PG line) at or above it."""
    groups = [[] for _ in anchors]
    for top, text in lines:
        idx = 0
        for i, a in enumerate(anchors):
            if top >= a - 2:
                idx = i
        groups[idx].append(text)
    return groups


def split_entries(lines, anchors, starts_entry):
    """Split a cell's lines into one entry per packing group.

    Usually each entry sits level with its PG line, but some rows are typeset out of
    alignment; when the number of entry-starting lines matches the number of PGs,
    assign them in order instead of by position.
    """
    starts = [i for i, (_, t) in enumerate(lines) if starts_entry(t)]
    if len(starts) == len(anchors) and starts and starts[0] == 0:
        bounds = starts + [len(lines)]
        return [[t for _, t in lines[a:b]] for a, b in zip(bounds, bounds[1:])]
    return group_by_anchor(lines, anchors)


def join_list(parts):
    return re.sub(r",\s*,", ",", ", ".join(p.strip(" ,") for p in parts if p.strip(" ,"))).strip(", ")


def parse_a41(pdf):
    items = []
    for page in pdf.pages:
        words = page.extract_words(keep_blank_chars=False)
        header = [w for w in words if w["text"] == "(3)"]
        if not header or not any(w["text"] == "A4.1" for w in words):
            continue
        top_min = header[0]["bottom"] + 1
        for top, bottom in cell_rows(page, 114, 301, top_min):
            rw = [w for w in words if top - 1 <= (w["top"] + w["bottom"]) / 2 <= bottom + 1]
            cols = {name: lines_in(rw, x0, x1) for name, x0, x1 in A41_COLS}
            psn = clean(" ".join(t for _, t in cols["PSN"]))
            if not psn:
                continue
            base = {
                "TN": clean(" ".join(t for _, t in cols["TN"])),
                "UN": clean(" ".join(t for _, t in cols["UN"])).replace(" ", ""),
                "PSN": psn,
                "Class": clean(" ".join(t for _, t in cols["Class"])),
            }
            pg_lines = [(t, x) for t, x in cols["PG"] if x in ROMAN or x == "IIII"]
            order = ["I", "II", "III"]
            fixed = []
            for t, x in pg_lines:  # the PDF has at least one "IIII" typo; keep PGs strictly increasing
                x = "II" if x == "IIII" else x
                if fixed and order.index(x) <= order.index(fixed[-1][1]):
                    x = order[min(order.index(fixed[-1][1]) + 1, 2)]
                fixed.append((t, x))
            pg_lines = fixed
            if len(pg_lines) <= 1:
                items.append({
                    **base,
                    "SubClass": join_list([t for _, t in cols["SubClass"]]),
                    "PG": pg_lines[0][1] if pg_lines else clean(" ".join(t for _, t in cols["PG"])),
                    "SpecProv": join_list([t for _, t in cols["SpecProv"]]),
                    "PackingPara": clean(" ".join(t for _, t in cols["PackingPara"])),
                })
                continue
            # one table row lists several packing groups: split into one entry per PG
            anchors = [t for t, _ in pg_lines]
            n = len(anchors)
            sub = split_entries(cols["SubClass"], anchors, lambda t: True)
            sp = split_entries(cols["SpecProv"], anchors, lambda t: re.match(r"P\d", t))
            pk = split_entries(cols["PackingPara"], anchors, lambda t: re.match(r"A\d|FORBIDDEN", t))
            for i, (_, pg) in enumerate(pg_lines):
                items.append({
                    **base,
                    "SubClass": join_list(sub[i]),
                    "PG": pg,
                    "SpecProv": join_list(sp[i]),
                    "PackingPara": clean(" ".join(pk[i])),
                })
    for it in items:
        it["PSN"] = KNOWN_TEXT_FIXES.get(it["PSN"], it["PSN"])
    # the manual repeats a few rows verbatim (e.g. on adjacent pages); keep one copy
    seen, unique = set(), []
    for it in items:
        key = json.dumps(it, sort_keys=True)
        if key not in seen:
            seen.add(key)
            unique.append(it)
    return unique


SP_CODE = re.compile(r"^\*?((?:[APN]\d+)|\d+)$")


def parse_a42(pdf):
    provisions, current = [], None
    started = False
    for page in pdf.pages:
        words = page.extract_words(extra_attrs=["fontname"])
        if not started and title_top(words, "A4.2.") is None:
            continue
        started = True
        stop = title_top(words, "A4.3.")
        body = [w for w in words if w["top"] > 60 and (stop is None or w["top"] < stop - 2)]
        lines = []
        for w in sorted(body, key=lambda w: w["top"]):
            if lines and w["top"] - lines[-1][0]["top"] < 3:
                lines[-1].append(w)
            else:
                lines.append([w])
        lines = [sorted(ln, key=lambda w: w["x0"]) for ln in lines]
        for ln in lines:
            first = ln[0]
            m = SP_CODE.match(first["text"])
            if m and "Bold" in first["fontname"] and first["x0"] < 90:
                current = {"provision": m[1], "details": clean(" ".join(w["text"] for w in ln[1:]))}
                provisions.append(current)
            elif current and not ("Bold" in first["fontname"] and first["text"].startswith(("Passenger", "Numeric", '"A”', '"N”', "“N”", "“A”", '"A"', '"N"'))):
                current["details"] = clean(current["details"] + " " + " ".join(w["text"] for w in ln))
        if stop is not None:
            break
    for p in provisions:
        p["details"] = re.sub(r"\s+\(T-0\)", " (T-0)", p["details"]).replace("( T-0", "(T-0")
    return provisions


def title_top(words, number):
    """y position of a bold 'Table <number>' title on the page, if present."""
    for a, b in zip(words, words[1:]):
        if a["text"] == "Table" and b["text"] == number and "Bold" in b.get("fontname", "Bold") and abs(a["top"] - b["top"]) < 2:
            return a["top"]
    return None


RQ = re.compile(r"([\d ,.]+?)\s*\(([\d.]+)\)")


def parse_rq(text):
    """'5000 (2270)' -> ('5000', '2270'). Tolerates stray spaces ('1 000') and stray numbers ('50 5000')."""
    m = RQ.search(text)
    if not m:
        return text, ""
    kg = m[2]
    tokens = m[1].split()
    candidates = [tokens[-1]] + ["".join(tokens[i:]) for i in range(len(tokens) - 1)]
    target = float(kg) * 2.2046
    lbs = min(candidates, key=lambda c: abs(float(c.replace(",", "")) - target))
    return lbs, kg


def parse_a43(pdf):
    out = []
    started = False
    for page in pdf.pages:
        words = page.extract_words(extra_attrs=["fontname"])
        if not started:
            if title_top(words, "A4.3.") is None:
                continue
            started = True
        for nx0, nx1, rx1 in ((69, 230, 295), (321, 482, 547)):
            top_min = max((w["bottom"] for w in words if nx0 - 5 <= w["x0"] < rx1 and w["text"] == "(kilograms)"), default=0) + 1
            bands = []
            for top, bottom in cell_rows(page, nx0, nx1, top_min):
                # a missing rule can merge two rows; split where a second RQ value starts
                band_words = [w for w in words if top - 1 <= (w["top"] + w["bottom"]) / 2 <= bottom + 1]
                anchors = [t for t, txt in lines_in(band_words, nx1, rx1) if RQ.search(txt)]
                cuts = [top] + [a - 1 for a in anchors[1:]] + [bottom]
                bands += list(zip(cuts, cuts[1:]))
            for top, bottom in bands:
                rw = [w for w in words if top - 1 <= (w["top"] + w["bottom"]) / 2 <= bottom + 1]
                name_words = sorted((w for w in rw if nx0 <= w["x0"] < nx1), key=lambda w: (round(w["top"]), w["x0"]))
                if not name_words:
                    continue
                # split the cell into lines, remembering each line's indent
                lines = []
                for w in name_words:
                    if lines and abs(lines[-1]["top"] - w["top"]) < 3:
                        lines[-1]["words"].append(w["text"])
                    else:
                        lines.append({"top": w["top"], "x": w["x0"], "words": [w["text"]]})
                main = [clean(" ".join(l["words"])) for l in lines if l["x"] < nx0 + 9]
                indented = [clean(" ".join(l["words"])) for l in lines if l["x"] >= nx0 + 9]
                name = clean(" ".join(main))
                if not name or name.startswith(("*Footnotes", "Table A4.3", "Hazardous substance")):
                    continue
                rq = clean(" ".join(t for _, t in lines_in(rw, nx1, rx1)))
                lbs, kg = parse_rq(rq)
                if not lbs and out:
                    # a blank RQ row is an isomer grouped under the entry above
                    lbs, kg = out[-1]["reportable_quantity_lbs"], out[-1]["reportable_quantity_kg"]
                out.append({"substance": name, "reportable_quantity_lbs": lbs, "reportable_quantity_kg": kg})
                # isomers listed (indented) under an entry share its reportable quantity
                for part in indented:
                    out.append({"substance": part, "reportable_quantity_lbs": lbs, "reportable_quantity_kg": kg})
    return out


def main():
    pdf = pdfplumber.open(sys.argv[1])
    items = parse_a41(pdf)
    provisions = parse_a42(pdf)
    substances = parse_a43(pdf)
    (OUT / "item-table.json").write_text(json.dumps({"HazData": items}, indent=1, ensure_ascii=False) + "\n")
    (OUT / "special-provisions.json").write_text(json.dumps({"P": provisions}, indent=1, ensure_ascii=False) + "\n")
    (OUT / "hazardous_substances.json").write_text(json.dumps(substances, indent=1, ensure_ascii=False) + "\n")
    print(f"A4.1 items: {len(items)}  A4.2 provisions: {len(provisions)}  A4.3 substances: {len(substances)}")


if __name__ == "__main__":
    main()
