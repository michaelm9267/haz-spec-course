"""Download 49 CFR hazmat tables from the eCFR API and convert them to JSON.

Produces, in src/data-file/cfr/:
  hmt.json                     §172.101 Hazardous Materials Table
  special-provisions.json      §172.102 special provisions (incl. IB/IP codes)
  hazardous-substances.json    Appendix A to §172.101, Table 1 (reportable quantities)
  meta.json                    the eCFR date the data was taken from

Usage (from the repo root; standard library only):
  python3 scripts/fetch_49cfr.py            # latest available date
  python3 scripts/fetch_49cfr.py 2026-11-23 # a specific date
"""

import gzip
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

API = "https://www.ecfr.gov/api/versioner/v1"
OUT_DIR = Path(__file__).resolve().parent.parent / "src" / "data-file" / "cfr"

# 172.101 column order
HMT_COLUMNS = [
    "symbols", "name", "hazardClass", "un", "pg", "labels", "specialProvisions",
    "pkgExceptions", "pkgNonBulk", "pkgBulk", "qtyPassenger", "qtyCargo",
    "vesselLocation", "vesselOther",
]

SP_CODE = re.compile(r"^((?:[ABNRTW]|TP|IB|IP)?\d+)\s+(.*)$", re.S)


def fetch(url):
    req = urllib.request.Request(url, headers={"Accept-Encoding": "gzip"})
    with urllib.request.urlopen(req, timeout=300) as resp:
        data = resp.read()
        if resp.headers.get("Content-Encoding") == "gzip":
            data = gzip.decompress(data)
    return data


def latest_date():
    titles = json.loads(fetch(f"{API}/titles.json"))["titles"]
    return next(t for t in titles if t["number"] == 49)["up_to_date_as_of"]


def fetch_section(date, section):
    url = f"{API}/full/{date}/title-49.xml?part=172&section={section}"
    root = ET.fromstring(fetch(url))
    for br in root.iter("br"):  # line breaks inside cells should read as spaces
        br.tail = " " + (br.tail or "")
    return root


def text(el):
    return re.sub(r"\s+", " ", "".join(el.itertext())).strip()


def find_table(root, caption_start):
    for table in root.iter("TABLE"):
        caption = table.find("CAPTION")
        if caption is not None and text(caption).startswith(caption_start):
            return table
    raise ValueError(f"Table not found: {caption_start}")


def body_rows(table):
    for tr in table.find("TBODY").iter("TR"):
        yield [text(td) for td in tr.findall("TD")]


def parse_hmt(root):
    rows = []
    for cells in body_rows(find_table(root, "§ 172.101 Hazardous Materials Table")):
        if len(cells) != len(HMT_COLUMNS):
            continue
        row = dict(zip(HMT_COLUMNS, cells))
        if row["name"]:
            rows.append(row)
        elif rows and any(row.values()):
            # an entry with several packing groups continues on rows that leave the
            # name (and usually symbols, class, ID and labels) blank
            prev = rows[-1]
            for key in ("symbols", "name", "hazardClass", "un", "labels"):
                if not row[key]:
                    row[key] = prev[key]
            rows.append(row)
    return rows


def parse_rq(value):
    m = re.match(r"^\s*([\d.,]+)\s*\(([\d.,]+)\)", value)
    return (m[1], m[2]) if m else (value, "")


def parse_substances(root):
    out = []
    for cells in body_rows(find_table(root, "Table 1 to Appendix A")):
        if len(cells) != 2 or not cells[0]:
            continue
        lbs, kg = parse_rq(cells[1])
        out.append({"substance": cells[0], "lbs": lbs, "kg": kg})
    return out


def parse_special_provisions(root):
    provisions = {}
    current = None

    # Coded paragraphs inside the EXTRACT blocks; un-coded paragraphs continue the previous code.
    for extract in root.iter("EXTRACT"):
        for el in extract:
            if el.tag in ("HD2", "TABLE", "DIV", "MATH"):
                continue
            t = text(el)
            if not t:
                continue
            m = SP_CODE.match(t)
            if m:
                current = m[1]
                provisions[current] = m[2]
            elif current:
                provisions[current] += "\n" + t

    # IB / IP codes live in two-column tables; a blank first cell continues the previous row.
    # Some IP rows put the code and its text together in the first cell ("IP15 For UN2031 ...").
    for caption in ("Table 1—IB Codes", "Table 2—IP Codes", "Table 3—IB Codes"):
        current = None
        for cells in body_rows(find_table(root, caption)):
            code, detail = cells[0], " ".join(cells[1:]).strip()
            m = SP_CODE.match(code)
            if m:
                code, detail = m[1], f"{m[2]} {detail}".strip()
            if code:
                current = code
                provisions.setdefault(current, detail)
            elif current and detail:
                provisions[current] += "\n" + detail

    # Portable tank instructions T1-T22: summarise each table row from its column headers.
    t_table = find_table(root, "Table of Portable Tank T Codes T1-T22")
    headers = [re.sub(r"\s*\(\d+\)$", "", text(th)) for th in t_table.find("THEAD").iter("TH")]
    for cells in body_rows(t_table):
        if len(cells) == len(headers) and re.fullmatch(r"T\d+", cells[0]):
            provisions[cells[0]] = "Portable tank instruction. " + "; ".join(
                f"{h}: {v}" for h, v in zip(headers[1:], cells[1:])
            )

    # Codes defined in ordinary paragraphs: "(iii) T50 When ...", "(iv) T75. When ...", "R1 A person ...".
    for p in root.iter("P"):
        t = text(p)
        m = re.match(r"^(?:\([ivx]+\)\s+)?(T\d+|R\d+)\.?\s+(.*)$", t, re.S)
        if m and m[1] not in provisions:
            provisions[m[1]] = m[2]

    return [{"provision": k, "details": v} for k, v in provisions.items()]


def write(name, data):
    path = OUT_DIR / name
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {path.relative_to(OUT_DIR.parent.parent.parent)} ({len(data)} entries)")


def main():
    date = sys.argv[1] if len(sys.argv) > 1 else latest_date()
    print(f"Fetching 49 CFR as of {date}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    hmt_root = fetch_section(date, "172.101")
    sp_root = fetch_section(date, "172.102")

    write("hmt.json", parse_hmt(hmt_root))
    write("hazardous-substances.json", parse_substances(hmt_root))
    write("special-provisions.json", parse_special_provisions(sp_root))
    write("meta.json", {"asOf": date, "source": "https://www.ecfr.gov/current/title-49/part-172"})


if __name__ == "__main__":
    main()
