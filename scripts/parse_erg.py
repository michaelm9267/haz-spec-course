"""Parse the ERG 2024 (Emergency Response Guidebook) PDF into src/data-file/erg.json.

Usage (from the repo root):
    pip install pdfplumber
    python scripts/parse_erg.py "path/to/2024-emergency-response-guidebook.pdf"

Source: the official ERG 2024 PDF, published by PHMSA (US DOT) and Transport
Canada/CANUTEC, e.g. https://tc.canada.ca/en/dangerous-goods/canutec/emergency-response-guidebook/pdf-version

Reads:
  - the yellow section (entries by ID number): ID, guide number, material name,
    and whether the entry is highlighted green (toxic inhalation hazard / water-
    reactive: use Table 1 for isolation and protective action distances);
  - the orange section (guide pages): each guide's title.

Writes {"edition", "guides": {"128": "Flammable Liquids (Water-Immiscible)"},
        "entries": [{"id": "1203", "guide": "128", "name": "...", "tih": false}]}.
"""
import json
import re
import sys
from pathlib import Path

import pdfplumber

ID = re.compile(r"^(\d{4}|—)$")
GUIDE = re.compile(r"^(1[1-7]\d)(P?)$")
OUT = Path(__file__).resolve().parent.parent / "src" / "data-file" / "erg.json"


def highlights(page):
    """Green highlight boxes. They are drawn in a spot (Separation) colour that
    pdfplumber reports as a bare tint, so on yellow-section pages every filled
    rectangle is a highlight; the white page itself is not drawn."""
    return [r for r in page.rects if r.get("fill")]


def column_lines(page, x0, x1):
    words = [w for w in page.extract_words(keep_blank_chars=False, use_text_flow=False) if x0 <= w["x0"] < x1]
    lines = {}
    for w in words:
        lines.setdefault(round(w["top"] / 3), []).append(w)
    return [sorted(ws, key=lambda w: w["x0"]) for _, ws in sorted(lines.items())]


def yellow_section(pdf):
    entries = []
    for page in pdf.pages:
        head = (page.extract_text() or "")[:60]
        if not head.startswith("ID Guide Name of Material"):
            continue
        greens = highlights(page)
        mid = page.width / 2
        for x0, x1 in ((0, mid), (mid, page.width)):
            current = None
            for ws in column_lines(page, x0, x1):
                texts = [w["text"] for w in ws]
                if texts[:2] in (["ID", "Guide"], ["No.", "No."]) or texts[0].startswith("Page"):
                    continue
                if len(texts) >= 3 and ID.match(texts[0]) and GUIDE.match(texts[1]):
                    top = ws[0]["top"]
                    tih = any(r["x0"] - 2 <= ws[0]["x0"] <= r["x1"] and r["top"] - 2 <= top <= r["bottom"] for r in greens)
                    current = {"id": None if texts[0] == "—" else texts[0], "guide": texts[1], "name": " ".join(texts[2:]), "tih": tih}
                    entries.append(current)
                elif current:
                    sep = "" if current["name"].endswith("-") else " "
                    current["name"] += sep + " ".join(texts)
    for e in entries:
        e["name"] = re.sub(r"\s+", " ", e["name"]).strip()
    return [e for e in entries if e["id"]]


def guide_titles(pdf):
    titles = {}
    for page in pdf.pages:
        lines = (page.extract_text() or "").split("\n")
        if len(lines) < 3 or lines[0].strip() != "GUIDE":
            continue
        head = []
        for line in lines[1:5]:
            if line.strip() == "EMERGENCY RESPONSE" or line.startswith("POTENTIAL"):
                break
            head.append(line.strip())
        text = " ".join(head)
        m = re.search(r"\b(1[1-7]\d)\b", text)
        if m and m.group(1) not in titles:
            titles[m.group(1)] = re.sub(r"\s+", " ", (text[: m.start()] + text[m.end():]).strip())
    return titles


def main(path):
    with pdfplumber.open(path) as pdf:
        entries = yellow_section(pdf)
        guides = guide_titles(pdf)
    data = {"edition": "ERG2024", "guides": dict(sorted(guides.items())), "entries": entries}
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(f"{len(entries)} ID entries, {len({e['id'] for e in entries})} ID numbers, {len(guides)} guides -> {OUT}")


if __name__ == "__main__":
    main(sys.argv[1])
