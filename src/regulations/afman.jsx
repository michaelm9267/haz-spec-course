import { getHazardClass, splitList } from "../utils/hazard";
import { afmanExceptedQuantity, afmanLimitedQuantity } from "../utils/quantities";

const CARGO_ONLY_CODES = ["P1", "P2", "P3", "P4"];

/**
 * Split an AFMAN special-provisions cell into codes. Handles normal "A1, P5"
 * lists as well as codes merged during PDF extraction ("N34P4").
 */
export const parseAfmanProvisions = (value) =>
  [...new Set((value || "").toUpperCase().match(/[A-Z]*\d+/g) || [])];

const classLabel = (code) => {
  const info = getHazardClass(code);
  return info ? `${code} – ${info.Label}` : code;
};

const normaliseItem = (row, id) => {
  const provisionCodes = parseAfmanProvisions(row.SpecProv);
  return {
    id,
    un: row.UN,
    name: row.PSN,
    symbols: row.TN,
    hazardClass: row.Class,
    subsidiaryClasses: splitList(row.SubClass),
    subsidiaryHazards: splitList(row.SubClass),
    pg: row.PG,
    provisionCodes,
    forbidden: /FORBIDDEN/i.test(row.PackingPara),
    airForbidden: false,
    cargoOnly: provisionCodes.some((c) => CARGO_ONLY_CODES.includes(c)),
    raw: row,
  };
};

const afman = {
  key: "afman",
  name: "AFMAN 24-604",
  description: "Preparing hazardous materials for military air shipment",
  forbiddenLabel: "Forbidden for air transport",
  tabs: {
    items: "Item Table (A4.1)",
    provisions: "Special Provisions (A4.2)",
    substances: "Hazardous Substances & RQs (A4.3)",
  },
  symbols: {
    "✭": "A technical name is required in association with the PSN.",
    "+": "Fixes the proper shipping name, hazard class and packing group for this entry, whether or not the material meets the definition of that class or packing group.",
    D: "The PSN applies only to domestic shipments (these items also have NA numbers). For international shipments, select an alternate PSN not preceded by a D.",
  },

  async load() {
    const [items, provisions, substances] = await Promise.all([
      import("../data-file/item-table.json"),
      import("../data-file/special-provisions.json"),
      import("../data-file/hazardous_substances.json"),
    ]);
    const provisionList = provisions.default.P.map((p) => ({ code: p.provision, details: p.details }));
    return {
      items: items.default.HazData.map(normaliseItem),
      provisions: provisionList,
      provisionMap: new Map(provisionList.map((p) => [p.code, p.details])),
      substances: substances.default.map((s) => ({
        substance: s.substance,
        lbs: s.reportable_quantity_lbs,
        kg: s.reportable_quantity_kg,
      })),
      sourceNote: "Source: AFMAN 24-604 (2025), Attachment 4 Tables A4.1–A4.3, extracted from the PDF.",
      provisionsMissingText: "Not defined in Table A4.2 of this edition.",
    };
  },

  itemColumns: [
    { key: "symbols", header: "Symbol", width: "4rem" },
    { key: "un", header: "UN/ID", width: "6rem" },
    { key: "name", header: "Proper Shipping Name" },
    { key: "hazardClass", header: "Hazard Class", render: (i) => i.hazardClass && classLabel(i.hazardClass) },
    { key: "sub", header: "Subsidiary", render: (i) => i.subsidiaryClasses.map(classLabel).join(", ") },
    { key: "pg", header: "PG", width: "6rem" },
    { key: "sp", header: "Special Provisions", render: (i) => i.raw.SpecProv },
    { key: "para", header: "Packing Para", width: "8rem", render: (i) => i.raw.PackingPara },
  ],

  filterItem: (i, q) => [i.un, i.name, i.hazardClass, i.raw.SubClass].some((f) => f.toLowerCase().includes(q)),

  quantityCards: (i) => [afmanExceptedQuantity(i), afmanLimitedQuantity(i)],

  detailFields: (i) => [
    { label: "Packing group", value: i.pg || "Not specified" },
    { label: "Packing paragraph", value: i.raw.PackingPara || "Not specified" },
  ],
};

export default afman;
