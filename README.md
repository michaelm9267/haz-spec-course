# HazRef

A searchable hazmat reference for **AFMAN 24-604** and **49 CFR**, plus slides for the Hazmat Specialist course.

Live site: https://michaelm9267.github.io/haz-spec-course/

## Features

- **Regulation switcher** (header): work out of AFMAN 24-604 or 49 CFR. The choice is in the URL (`#/afman/...`, `#/cfr/...`) and is remembered between visits. If you switch while viewing an item, HazRef opens the matching entry in the other regulation when it finds one.
- **Search** (header): find any item in the active regulation by UN/ID number or proper shipping name. Use the arrow keys and Enter to pick a result.
- **Tables**: three tabs for each regulation.
  - AFMAN 24-604: Item Table (A4.1), Special Provisions, Hazardous Substances & RQs (A4.3).
  - 49 CFR: Hazardous Materials Table (§172.101), Special Provisions (§172.102), Hazardous Substances (Appendix A).

  Every tab can be filtered and paged. The tab, filter and page are kept in the URL.
- **Item detail**: shows the hazard class, subsidiary classes or required labels, the packing group and the meaning of each column-1 symbol. Special provisions are spelled out. Forbidden and Cargo Aircraft Only items are flagged. 49 CFR entries also show packaging sections (linked to eCFR), quantity limits and vessel stowage.
- **Excepted & limited quantities** (item detail page): whether the entry can ship as an excepted or limited quantity, and the inner and per-package limits that apply.
  - AFMAN 24-604: Attachment 19 (A19.2, Table A19.1, A19.3, Table A19.2).
  - 49 CFR: §173.4a, the §173.150–155 and §173.306 ground limited quantities, and §173.27(f) Table 3 for aircraft.
  - The logic is in `src/utils/quantities.js`, and each result cites its paragraph.
- **Load compatibility** (`#/compatibility`): build a load from the active regulation's table and check every pair of items. The page shows a matrix, an overall verdict, and each pair's reasons with citations. The load is kept in the URL, and each item page links here.
  - AFMAN 24-604 Chapter 2: Table A18.1 and its notes 1–12, and Table A18.2 (explosive compatibility groups) with its notes 1–8. Items can be flagged as an excepted quantity or as Fissile Class III.
  - AFMAN 24-604 Chapter 3: the A18.4 rules. Pairs that are normally incompatible become "separate to the maximum extent possible", and the five mandatory restrictions still apply.
  - 49 CFR: §175.78 aircraft segregation (primary and subsidiary labels) and §177.848 highway segregation, including the Class 1 table.
  - The logic is in `src/utils/compatibility.js`.
- **Shipper's declaration** (`#/declaration`): enter the shipment, add each hazardous material by UN number, and generate a declaration you can edit in place and print or save as a PDF.
  - AFMAN 24-604: laid out like DAF Form 7507 (20250131). Page 1 is the Shipper's Declaration for Dangerous Goods: shipper with phone and DSN, air waybill, TCN, consignee, aircraft limitation and shipment type with the non-applicable choices struck through, the dangerous goods table (for Class 1 the NEW replaces the mass per package in the quantity and type of packing column; Cargo Aircraft Only is shown only by the aircraft limitation box; RQ goes under the UN number and LTD QTY in the Authorization column), additional handling information, the emergency telephone number (numbers only; the agency stays on the entry form) and the certification. The ERG guide lines print under Additional Handling Information only when "Print ERG guides on the form" is ticked. If an item doesn't fully fit in the Dangerous Goods Identification box, it and the items after it continue on another declaration page (the whole page is repeated, numbered PAGE n OF n PAGES). The blank Shipper's Checklist comes last. A "Red borders" checkbox turns the red-striped side borders on or off; the choice is remembered. Turn it off to print on stock that already has the red borders: the boxes stay in exactly the same place either way. Each page prints on one US Letter sheet. The layout is in `src/components/DafForm7507.jsx`.
  - 49 CFR: a shipping paper with the §172.202 basic description and the §172.203 additional entries (RQ, technical names, inhalation-hazard zone, limited quantity, Cargo Aircraft Only), the §172.604 emergency number, and the §172.204 certification, including the air statement.
  - The page flags problems before you generate: missing required fields and technical names, cargo-aircraft-only items on passenger aircraft, 49 CFR column 9 aircraft quantity limits, possible RQ substances, and compatibility conflicts.
  - Emergency response information is filled in from the ERG2024 guide for each UN number added (for example `UN1203: ERG2024 Guide 128 — Flammable Liquids (Water-Immiscible)`), and entries the ERG highlights green get a toxic inhalation hazard / Table 1 note. Class 1 uses the ERG's division rows (Guide 112 or 114). Each line shows its guide, and the text can be edited; "Fill from UN numbers" restores it. Entries the ERG doesn't list are flagged.
  - The 24-hour emergency phone and the agency fill in from the ERG2024's numbers for DoD (military) shipments: the U.S. Army Operations Center (703-695-4695/4696) for explosives/ammunition, the Defense Logistics Agency (1-800-851-8061) for everything else, and both, labelled, for a mixed load. Entries with an explosive subsidiary hazard (the type B organic peroxides UN3101/3102/3111/3112) get both. Ticking "International shipment" (ticked automatically when an overseas DoDAAC is picked) gives the Army number in +1 form, collect calls accepted, and warns that DLA's U.S. toll-free line may not be reachable from abroad. Typing a value overrides it; clearing the field brings the ERG number back. For non-DoD 49 CFR shipments, enter your registered emergency response provider (§ 172.604(b)). The logic is in `src/utils/erg.js`.
  - Drafts are saved per regulation in the browser. The logic is in `src/utils/declaration.js`.
- **DoDAAC lookup** (`#/dodaac`, `#/dodaac?code=FB2029`): search by DoDAAC, unit name, base/city or ZIP and see the address, aerial and surface ports (APOE/APOD/SPOE/SPOD), ICAO code and any other addresses recorded under the code. Generic codes shared by many organizations (FB0000, FB1234 …) are flagged. The Shipper and Consignee boxes on the shipper's declaration can be filled from a DoDAAC. The logic is in `src/utils/dodaac.js`.
- **Calculators**: a compressed gas cylinder calculator. Pick the gas by UN number from the active regulation's Class 2 entries (`#/calculators?un=UN1066`; Class 2 item pages link here). Choose a cylinder type (lecture bottle; industrial steel sizes 40–300; medical M6 through H; SCUBA AL80; propane and CO₂ cylinders sold by weight) to fill in typical values (`CYLINDERS` in `src/utils/gas.js`), or enter the water capacity and fill pressure yourself, to get the free gas volume, and the gas mass when the molar mass is known (`GAS_DATA` in `src/utils/gas.js`). It warns when the entry is liquefied, refrigerated, dissolved or an article, because the pressure-based estimate does not apply, and for 49 CFR it compares the mass to the per-package limits for passenger and cargo aircraft.
- **Course**: slides you can move through with the buttons, the progress dots or the ← → keys.

## Development

```bash
npm install
npm start        # dev server at http://localhost:3000
npm test         # run tests
npm run deploy   # build and publish to GitHub Pages
```

The app uses `HashRouter`, so deep links work on GitHub Pages. Public assets are referenced through `assetUrl()` in `src/utils/hazard.js` so they resolve under the `/haz-spec-course/` sub-path.

Each regulation is a module in `src/regulations/` (`afman.jsx`, `cfr.jsx`). It loads that regulation's data, converts it to a shared item format and defines the table columns and detail fields. Adding another regulation means adding another module and registering it in `RegulationContext.jsx`.

## Data

| File | Contents |
| --- | --- |
| `src/data-file/item-table.json` | Table A4.1 item table |
| `src/data-file/special-provisions.json` | Special provision codes and text |
| `src/data-file/hazardous_substances.json` | Table A4.3 reportable quantities |
| `src/data-file/hazardClasses.json` | Hazard class names and label images |
| `src/data-file/cfr/` | 49 CFR §172.101 table, §172.102 special provisions, Appendix A RQs |
| `public/data/DODAACs.sqlite` | DoDAAC addresses (SQLite) |
| `src/data-file/erg.json` | ERG2024 ID number → guide, green (TIH) highlights, guide titles |

### ERG data

`src/data-file/erg.json` is parsed from the official ERG2024 PDF ([Transport Canada copy](https://tc.canada.ca/en/dangerous-goods/canutec/emergency-response-guidebook/pdf-version); PHMSA blocks scripted downloads). To refresh it for a new edition, run from the repo root:

```bash
pip install pdfplumber
python scripts/parse_erg.py "path/to/2024-emergency-response-guidebook.pdf"
```

It reads the yellow section (ID number, guide, name, green highlight) and the orange guide titles. Spot-check a few entries, including some green ones, against the PDF.

### DoDAAC database

`public/data/DODAACs.sqlite` (table `dodaacs`, indexed on `DODAAC_ID`, `ORGN_NAME`, `ORGN_CITY`, `ORGN_ZIP` and others) is served as a static file and queried in the browser with [sql.js](https://sql.js.org) (SQLite compiled to WebAssembly). It is downloaded only when a lookup is first used.

- Create React App's webpack can't bundle sql.js, so `scripts/copy-sqljs.js` copies its browser runtime from `node_modules` to `public/vendor/sql.js/` (git-ignored). This runs automatically before `npm start` and `npm run build`, so `npm run deploy` publishes both the runtime and the database.
- The table is a CSV import with many rows per DoDAAC and some rows whose columns are shifted. Queries keep only rows with a six-character code and address type `D` or `M`, and merge rows that share the same address.
- To replace the data, drop a new `DODAACs.sqlite` with the same `dodaacs` table into `public/data/` and run `npm test` (`src/dodaac.test.js` runs the real queries against it).

### Updating the 49 CFR data

The 49 CFR data comes from the [eCFR API](https://www.ecfr.gov/developers/documentation/api/v1). To refresh it from the repo root, run:

```bash
python3 scripts/fetch_49cfr.py            # latest eCFR date
python3 scripts/fetch_49cfr.py 2026-11-23 # or a specific date
```

The script uses only the Python standard library. The date it fetched is shown under the tables in the app.

### AFMAN data

The AFMAN 24-604 tables (2025 edition) come from the Attachment 4 PDF. To refresh them when a new edition comes out, run this from the repo root:

```bash
pip install pdfplumber
python scripts/parse_afman_a4.py "path/to/Attachment 4 Excerpt, AFMAN 24-604.pdf"
```

The script reads each table from the PDF's layout (word positions and the ruling lines between rows), so wrapped rows stay together. It writes:
- `item-table.json` (Table A4.1), with one row per packing group.
- `special-provisions.json` (Table A4.2).
- `hazardous_substances.json` (Table A4.3).

After running it, spot-check a few entries against the PDF.
