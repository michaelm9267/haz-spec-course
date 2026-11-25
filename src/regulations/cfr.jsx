import React from "react";
import ClassCard from "../components/ClassCard";
import { splitList } from "../utils/hazard";
import { cfrExceptedQuantity, cfrLimitedQuantity, division } from "../utils/quantities";

const ECFR = "https://www.ecfr.gov/current/title-49";

/** Packaging column values are §173 section numbers ("202", "302c") or "None". */
const Section173 = ({ value }) =>
  /^\d+[a-z]?$/.test(value) ? (
    <a href={`${ECFR}/section-173.${value}`} target="_blank" rel="noreferrer">
      § 173.{value}
    </a>
  ) : (
    value || "—"
  );

const normaliseItem = (row, id) => {
  const passengerForbidden = row.qtyPassenger === "Forbidden";
  const cargoForbidden = row.qtyCargo === "Forbidden";
  const forbidden = row.hazardClass === "Forbidden";
  return {
    id,
    un: row.un,
    name: row.name,
    symbols: row.symbols,
    hazardClass: row.hazardClass,
    subsidiaryClasses: [],
    labels: splitList(row.labels),
    // labels other than the primary hazard's are the subsidiary hazards
    subsidiaryHazards: splitList(row.labels).filter((l) => division(l) !== division(row.hazardClass)),
    pg: row.pg,
    // split on commas *and* spaces: the eCFR source has at least one missing comma ("B120 IB8")
    provisionCodes: [...new Set(row.specialProvisions.split(/[,\s]+/).filter(Boolean))],
    forbidden,
    airForbidden: !forbidden && passengerForbidden && cargoForbidden,
    cargoOnly: passengerForbidden && Boolean(row.qtyCargo) && !cargoForbidden,
    raw: row,
  };
};

const cfr = {
  key: "cfr",
  name: "49 CFR",
  description: "DOT Hazardous Materials Regulations for all modes of transport",
  forbiddenLabel: "Forbidden for transportation",
  tabs: {
    items: "Hazardous Materials Table (§172.101)",
    provisions: "Special Provisions (§172.102)",
    substances: "Hazardous Substances (App. A)",
  },
  symbols: {
    "+": "Proper shipping name, hazard class and packing group are fixed, whether or not the material meets the class definition.",
    A: "Subject to the regulations only when offered or intended for transportation by aircraft, unless it is a hazardous substance or hazardous waste.",
    D: "Proper shipping name is appropriate for domestic transportation but may be inappropriate for international transportation.",
    G: "One or more technical names must be entered in parentheses with the basic description (see § 172.203(k)).",
    I: "Proper shipping name is appropriate for international transportation.",
    W: "Subject to the regulations only when offered or intended for transportation by vessel, unless it is a hazardous substance or hazardous waste.",
  },

  async load() {
    const [hmt, provisions, substances, meta] = await Promise.all([
      import("../data-file/cfr/hmt.json"),
      import("../data-file/cfr/special-provisions.json"),
      import("../data-file/cfr/hazardous-substances.json"),
      import("../data-file/cfr/meta.json"),
    ]);
    const provisionList = provisions.default.map((p) => ({ code: p.provision, details: p.details }));
    const asOf = new Date(`${meta.default.asOf}T00:00:00`).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return {
      items: hmt.default.map(normaliseItem),
      provisions: provisionList,
      provisionMap: new Map(provisionList.map((p) => [p.code, p.details])),
      substances: substances.default,
      sourceNote: `Source: eCFR, 49 CFR Part 172, current as of ${asOf}.`,
      provisionsMissingText: "Not defined in the text of § 172.102.",
      provisionsLink: `${ECFR}/section-172.102`,
    };
  },

  itemColumns: [
    { key: "symbols", header: "Sym", width: "3.5rem" },
    { key: "name", header: "Description / Proper Shipping Name" },
    { key: "hazardClass", header: "Class", width: "6rem" },
    { key: "un", header: "ID No.", width: "6rem" },
    { key: "pg", header: "PG", width: "4rem" },
    { key: "labels", header: "Labels", render: (i) => i.raw.labels },
    { key: "sp", header: "Special Provisions", render: (i) => i.raw.specialProvisions },
    { key: "nonbulk", header: "Non-bulk (§173)", width: "7rem", render: (i) => i.raw.pkgNonBulk },
    { key: "pax", header: "Passenger aircraft/rail", width: "8rem", render: (i) => i.raw.qtyPassenger },
    { key: "cao", header: "Cargo aircraft only", width: "8rem", render: (i) => i.raw.qtyCargo },
  ],

  filterItem: (i, q) => [i.un, i.name, i.hazardClass, i.raw.labels].some((f) => f.toLowerCase().includes(q)),

  quantityCards: (i) => [cfrExceptedQuantity(i), ...cfrLimitedQuantity(i)],

  detailFields: (i) => [
    { label: "Packing group", value: i.pg || "None" },
    { label: "Packaging exceptions", value: <Section173 value={i.raw.pkgExceptions} /> },
    { label: "Non-bulk packaging", value: <Section173 value={i.raw.pkgNonBulk} /> },
    { label: "Bulk packaging", value: <Section173 value={i.raw.pkgBulk} /> },
    { label: "Passenger aircraft/rail limit", value: i.raw.qtyPassenger || "—" },
    { label: "Cargo aircraft only limit", value: i.raw.qtyCargo || "—" },
    { label: "Vessel stowage location", value: i.raw.vesselLocation || "—" },
    { label: "Vessel stowage other", value: i.raw.vesselOther || "—" },
  ],

  ExtraSections: ({ item }) =>
    item.labels.length > 0 && (
      <section>
        <h2>Required {item.labels.length > 1 ? "labels" : "label"}</h2>
        <div className="class-cards">
          {item.labels.map((code) => (
            <ClassCard key={code} code={code} />
          ))}
        </div>
      </section>
    ),
};

export default cfr;
