// Excepted quantity (EQ) and limited quantity (LQ) eligibility and limits for a table entry.
//
// AFMAN 24-604 (2025): Attachment 19 — A19.2 / Table A19.1 (EQ), A19.3 / Table A19.2 (LQ).
// 49 CFR: § 173.4a (EQ); §§ 173.150–173.155 and 173.306 (LQ, ground); § 173.27(f) Table 3 (LQ, aircraft).
//
// Each function returns a "card":
//   { title, status: "permitted" | "not-permitted" | "check", summary, rows, notes, cite }
// where rows = [{ label, inner, outer }]. Results are a study aid: they apply the general rules to
// the table entry and cannot see things like the material's physical state or packaging.

// ---------- helpers ----------

/** "6.1" -> "6.1", "1.4S" -> "1.4", "3" -> "3", "6.l" -> "6.1"; undefined when not a class. */
export const division = (code) => {
  const m = (code || "").replace(/\s/g, "").replace(/l/g, "1").match(/^\d(\.\d)?/);
  return m ? m[0] : undefined;
};
const classNum = (code) => division(code)?.[0];

const LITHIUM_BATTERIES = ["UN3090", "UN3091", "UN3480", "UN3481", "UN3536", "UN3556", "UN3557"];
const PIH_CODES = ["1", "2", "3", "4", "6"]; // special provisions marking a poison-inhalation hazard

const isPIH = (item) =>
  item.provisionCodes.some((c) => PIH_CODES.includes(c)) || /inhalation hazard/i.test(item.name);
const isSelfReactive = (item) => /SELF-REACTIVE/i.test(item.name);
const isAerosol = (item) => item.un === "UN1950";
const isRefrigeratedLiquid = (item) => /REFRIGERATED LIQUID/i.test(item.name);
const isKit = (item) => ["UN3316", "UN3269", "NA1760"].includes(item.un);

/** Best guess at physical state from the shipping name. */
export const physicalState = (item) => {
  const n = item.name.toUpperCase();
  if (/\bSOLID\b|\bPOWDER\b|\bDUST\b|\bGRANULES\b/.test(n)) return "solid";
  if (/\bLIQUID\b|\bSOLUTIONS?\b|\bLIQUIDS\b/.test(n)) return "liquid";
  return "unknown";
};

const subsidiaries = (item) => item.subsidiaryHazards || [];
const hasSubsidiaryClass = (item, cls) => subsidiaries(item).some((s) => classNum(s) === cls);
const hasSubsidiaryDiv = (item, div) => subsidiaries(item).some((s) => division(s) === div);
const anyHazard = (item, pred) => [item.hazardClass, ...subsidiaries(item)].some(pred);

const card = (title, cite, fields) => ({ title, cite, rows: [], notes: [], ...fields });
const no = (title, cite, summary, notes = []) => card(title, cite, { status: "not-permitted", summary, notes });

const fmtAmount = (n, solidOrLiquid) => {
  // n is in g or mL
  const big = n >= 1000;
  const v = big ? n / 1000 : n;
  if (solidOrLiquid === "liquid") return `${v} ${big ? "L" : "mL"}`;
  if (solidOrLiquid === "solid") return `${v} ${big ? "kg" : "g"}`;
  return `${v} ${big ? "kg" : "g"} or ${v} ${big ? "L" : "mL"}`;
};

// ---------- AFMAN 24-604 excepted quantities (A19.2, Table A19.1) ----------

const A191_OUTER = { I: 300, II: 500, III: 1000 };

function a191Limits(cls, pg) {
  // returns { inner, outer, state } in g/mL, or null if the row doesn't cover this PG
  switch (cls) {
    case "3":
      return { inner: 30, outer: A191_OUTER[pg], state: "liquid" };
    case "4":
    case "5":
    case "8":
    case "9":
      if (pg === "II" || pg === "III") return { inner: 30, outer: A191_OUTER[pg] };
      return null;
    case "6":
      return { inner: pg === "III" ? 30 : 1, outer: A191_OUTER[pg] };
    default:
      return null;
  }
}

export function afmanExceptedQuantity(item) {
  const T = "Excepted quantity";
  const cite = "AFMAN 24-604, A19.2 and Table A19.1";
  const div = division(item.hazardClass);
  const cls = classNum(item.hazardClass);
  const pg = item.pg;

  if (!div) return no(T, cite, "No hazard class is assigned to this entry.");
  if (item.forbidden) return no(T, cite, "Forbidden entries cannot be shipped as excepted quantities.");
  if (item.cargoOnly) return no(T, cite, "Material identified as Cargo Aircraft Only (P1–P4) is not permitted (A19.2.1.12).");
  if (cls === "1") return no(T, cite, "Class 1 material is not permitted (A19.2.1.1).");
  if (div === "2.1" || div === "2.3") return no(T, cite, `Division ${div} is not permitted (A19.2.1.2).`);
  if (isAerosol(item)) return no(T, cite, "Aerosols are not permitted (A19.2.1.2).");
  if (div === "2.2" && subsidiaries(item).length) return no(T, cite, "Division 2.2 with a subsidiary hazard is not permitted (A19.2.1.2).");
  if (cls === "4" && pg === "I") return no(T, cite, "Class 4, PG I is not permitted (A19.2.1.3).");
  if (hasSubsidiaryClass(item, "4") && pg === "I") return no(T, cite, "A Class 4 subsidiary hazard in PG I is not permitted (A19.2.1.3).");
  if (div === "4.1" && isSelfReactive(item)) return no(T, cite, "Class 4.1 self-reactive material is not permitted (A19.2.1.4).");
  if (anyHazard(item, (h) => classNum(h) === "5") && pg === "I" && !isKit(item))
    return no(T, cite, "Class 5 (primary or subsidiary) in PG I is not permitted unless in a chemical or first aid kit (A19.2.1.5).");
  if (anyHazard(item, (h) => division(h) === "6.1") && pg === "I" && isPIH(item))
    return no(T, cite, "Division 6.1, PG I, by reason of inhalation toxicity is not permitted (A19.2.1.6).");
  if (div === "6.2") return no(T, cite, "Class 6.2 infectious substances are not permitted (A19.2.1.7).");
  if (cls === "7") return no(T, cite, "Class 7 radioactive material is not permitted (A19.2.1.8); see Attachment 11.");
  if (anyHazard(item, (h) => classNum(h) === "8") && pg === "I") return no(T, cite, "Class 8 (primary or secondary) in PG I is not permitted (A19.2.1.9).");
  if (["UN1774", "UN2794", "UN2795", "UN2800", "UN2803", "UN2809", "UN3028", "UN3477"].includes(item.un))
    return no(T, cite, `${item.un} is not permitted in excepted quantities (Table A19.1, note 4; A19.2.1.9).`);
  if (item.un === "UN2807" || item.un === "UN1845" || LITHIUM_BATTERIES.includes(item.un))
    return no(T, cite, "Magnetized material, carbon dioxide solid and lithium batteries are not permitted (A19.2.1.10). Lithium battery exceptions are in A3.3.9.2.3.");

  const notes = [
    "Packaging: inner (plastic ≥0.2 mm, glass, earthenware or metal) → intermediate with cushioning/absorbent → strong rigid outer (A19.2.3–A19.2.7).",
    "Mark with the excepted quantity mark (Figure A19.1); no Shipper's Declaration, labels or Attachment 14/15/17 markings (A19.2.13).",
    "Different materials in one outer packaging: Q = n1/M1 + n2/M2 + … must not exceed 1.0 (A19.2.11).",
  ];

  if (div === "2.2") {
    return card(T, cite, {
      status: "permitted",
      summary: "Division 2.2 without a subsidiary hazard may be shipped as an excepted quantity.",
      rows: [{ label: "Gas (water capacity)", inner: "30 mL", outer: "1 L total" }],
      notes,
    });
  }
  if (div === "5.2") {
    return card(T, cite, {
      status: "check",
      summary: "Organic peroxides are permitted only when contained in a chemical kit or first aid kit (Table A19.1, note 3).",
      rows: pg ? [{ label: `PG ${pg}`, inner: "30 g or 30 mL", outer: fmtAmount(A191_OUTER[pg] || 500) }] : [],
      notes,
    });
  }

  // Most restrictive of the primary and subsidiary hazards (Table A19.1 is by primary or subsidiary hazard)
  const effectivePg = pg || (cls === "9" ? "II" : "");
  const hazards = [item.hazardClass, ...subsidiaries(item)];
  let inner = Infinity;
  let outer = Infinity;
  let state;
  for (const h of hazards) {
    const lim = a191Limits(classNum(h), effectivePg);
    if (!lim) continue;
    if (lim.inner < inner) inner = lim.inner;
    if (lim.outer < outer) outer = lim.outer;
    if (classNum(h) === classNum(item.hazardClass)) state = lim.state;
  }
  if (!isFinite(inner) || !isFinite(outer)) {
    return card(T, cite, { status: "check", summary: "Table A19.1 has no row for this class and packing group; check A19.2 directly.", notes });
  }
  if (cls === "9" && !pg) notes.unshift("No PG is given in Table A4.1, so PG II quantities apply (Table A19.1, note 5).");
  if (subsidiaries(item).length) notes.unshift("Limits shown are the most restrictive of the primary and subsidiary hazards.");

  return card(T, cite, {
    status: "permitted",
    summary: "May be shipped as an excepted quantity within these limits, if the material isn't in a device that is a component of a non-hazardous item (A19.2.1.11).",
    rows: [{ label: `Class ${div}${effectivePg ? `, PG ${effectivePg}` : ""}`, inner: fmtAmount(inner, state), outer: fmtAmount(outer, state) }],
    notes,
  });
}

// ---------- AFMAN 24-604 limited quantities (A19.3, Table A19.2) ----------

const A192 = {
  // division -> pg -> state -> [inner, perPackage]
  "3": { II: { liquid: ["500 mL", "1 L"] }, III: { liquid: ["5 L", "10 L"] } },
  "4.1": { II: { solid: ["500 g", "5 kg"] }, III: { solid: ["1 kg", "10 kg"] } },
  "4.3": { II: { solid: ["500 g", "5 kg"] }, III: { solid: ["1 kg", "10 kg"] } },
  "5.1": {
    II: { liquid: ["100 mL", "500 mL"], solid: ["500 g", "2.5 kg"] },
    III: { liquid: ["500 mL", "1 L"], solid: ["1 kg", "10 kg"] },
  },
  "6.1": {
    II: { liquid: ["100 mL", "1 L"], solid: ["500 g", "1 kg"] },
    III: { liquid: ["500 mL", "2 L"], solid: ["1 kg", "10 kg"] },
  },
  "8": {
    II: { liquid: ["100 mL", "500 mL"], solid: ["500 g", "5 kg"] },
    III: { liquid: ["500 mL", "1 L"], solid: ["1 kg", "5 kg"] },
  },
};
const AFMAN_LQ_CLASS9 = ["UN2071", "UN1990", "UN3077", "UN3082", "UN3316", "UN1941", "UN3334", "UN3335"];

function stateRows(table, state) {
  const states = state === "unknown" ? Object.keys(table) : Object.keys(table).filter((s) => s === state);
  return states.map((s) => ({ label: s[0].toUpperCase() + s.slice(1), inner: table[s][0], outer: table[s][1] }));
}

export function afmanLimitedQuantity(item) {
  const T = "Limited quantity";
  const cite = "AFMAN 24-604, A19.3 and Table A19.2";
  const div = division(item.hazardClass);
  const cls = classNum(item.hazardClass);
  const pg = item.pg;
  const notes = [
    "Combination packagings only; single and composite packagings are not permitted. Gross weight ≤ 30 kg (66 lb) (A19.3).",
    "Package must pass a 1.2 m drop test and a 3 m stacking test (A19.3.4). Mark, label and certify per Attachments 14, 15 and 17 (A19.3.5).",
  ];

  if (!div) return no(T, cite, "No hazard class is assigned to this entry.");
  if (item.forbidden) return no(T, cite, "Materials forbidden in Table A4.1 are not permitted (A19.3.1.1).");
  if (item.cargoOnly) return no(T, cite, "Material identified as Cargo Aircraft Only is not permitted (A19.3.1.11).");
  if (pg === "I") return no(T, cite, "Materials in PG I are not permitted (A19.3.1.2).");
  if (cls === "1") {
    if (["UN0012", "UN0014", "UN0323"].includes(item.un))
      return card(T, cite, { status: "check", summary: "Division 1.4S cartridges may be shipped as limited quantities as provided in 49 CFR 173.63 (A19.3.2.1).", rows: [{ label: "1.4S", inner: "See 49 CFR 173.63", outer: "See 49 CFR 173.63" }], notes });
    return no(T, cite, "Class 1 is not permitted except as provided in 49 CFR 173.63 (A19.3.1.3).");
  }
  if (cls === "7") return no(T, cite, "Class 7 is not permitted (A19.3.1.3); see Attachment 11.");
  if (div === "2.3" || div === "6.2") return no(T, cite, `Division ${div} is not permitted (A19.3.1.4).`);
  if (isRefrigeratedLiquid(item)) return no(T, cite, "Refrigerated liquefied gases are not permitted (A19.3.1.6).");
  if (div === "4.1" && isSelfReactive(item)) return no(T, cite, "Class 4.1 self-reactive substances are not permitted (A19.3.1.7).");
  if (div === "4.2" || hasSubsidiaryDiv(item, "4.2")) return no(T, cite, "Class 4.2, or any material with a 4.2 subsidiary hazard, is not permitted (A19.3.1.8).");
  if (["UN2794", "UN2795", "UN2803", "UN2809", "UN3028", "UN3506"].includes(item.un))
    return no(T, cite, `${item.un} is not permitted as a limited quantity (A19.3.1.9, A19.3.2.10).`);
  if (cls === "9" && !AFMAN_LQ_CLASS9.includes(item.un))
    return no(T, cite, "Only UN2071, UN1990, UN3077, UN3082, UN3316, UN1941, UN3334 and UN3335 are permitted in Class 9 (A19.3.1.10, A19.3.2.11).");

  if (cls === "2") {
    const listed = ["UN1950", "UN2037", "UN3478", "UN3479"].includes(item.un);
    if (div === "2.1" && !listed) return no(T, cite, "Division 2.1 is not permitted other than UN1950, UN2037, UN3478 and UN3479 (A19.3.1.5).");
    if (subsidiaries(item).length && !listed) return no(T, cite, "Gases with a subsidiary hazard are not permitted (A19.3.2.3).");
    if ((item.un === "UN1950" || item.un === "UN2037") && subsidiaries(item).length)
      return no(T, cite, "Aerosols and small receptacles are permitted only without a subsidiary hazard (A19.3.2.2).");
    return card(T, cite, {
      status: listed ? "permitted" : "check",
      summary: listed
        ? "Permitted as a limited quantity (A19.3.2.2)."
        : "A19.3.2.3 permits Class 2.2 gases without a subsidiary hazard, but A19.3.1.5 lists only UN1950, UN2037, UN3478 and UN3479 for 2.2 — confirm before shipping.",
      rows: [
        { label: "Gas (water capacity of inner packaging)", inner: "120 mL", outer: "30 kg gross" },
        ...(item.un === "UN1950" ? [
          { label: "Aerosols, non-toxic contents (note 3)", inner: "1,000 mL", outer: "30 kg gross" },
          { label: "Non-flammable, non-toxic heat-sensitive aerosols (note 4)", inner: "575 mL", outer: "25 kg gross" },
        ] : []),
      ],
      notes,
    });
  }

  if (div === "5.2") {
    return card(T, cite, {
      status: "check",
      summary: "Class 5.2 is permitted only in a Polyester Resin Kit (UN3269), Chemical Kit (NA1760) or First Aid Kit (A19.3.2.8).",
      rows: [{ label: "Liquid", inner: "30 mL", outer: "1 kg" }, { label: "Solid", inner: "100 g", outer: "1 kg" }],
      notes,
    });
  }
  if (cls === "9") {
    const kit = item.un === "UN3316";
    return card(T, cite, {
      status: "permitted",
      summary: "Permitted as a limited quantity (A19.3.2.11).",
      rows: kit
        ? [{ label: "Chemical or first aid kit", inner: "30 mL liquid / 100 g solid", outer: "1 kg per kit" }]
        : [{ label: "Liquid or solid", inner: "5 L", outer: "30 kg gross" }],
      notes,
    });
  }

  const byPg = A192[div]?.[pg];
  if (!byPg) return card(T, cite, { status: "check", summary: "Table A19.2 has no row for this class and packing group; check A19.3 directly.", notes });
  const state = physicalState(item);
  if (div === "4.3" && state === "liquid") return no(T, cite, "Only Class 4.3 solids are permitted (A19.3.2.6).");
  const rows = stateRows(byPg, state);
  if (!rows.length) return no(T, cite, `Table A19.2 lists no ${state} limit for Class ${div}, PG ${pg}.`);
  if (state === "unknown" && rows.length > 1) notes.unshift("Use the row for the material's physical state.");
  return card(T, cite, { status: "permitted", summary: "May be shipped as a limited quantity within these limits.", rows, notes });
}

// ---------- 49 CFR excepted quantities (§ 173.4a) ----------

export function cfrExceptedQuantity(item) {
  const T = "Excepted quantity";
  const cite = "49 CFR 173.4a";
  const div = division(item.hazardClass);
  const cls = classNum(item.hazardClass);
  const pg = item.pg;

  if (!div) return no(T, cite, item.forbidden ? "This material is forbidden for transportation." : "No hazard class is assigned to this entry.");
  if (item.forbidden || item.raw.qtyPassenger === "Forbidden" || item.cargoOnly)
    return no(T, cite, "Only materials authorized aboard passenger aircraft may be shipped as excepted quantities (§ 173.4a(b)).");

  const allowed = (() => {
    if (div === "2.2") return subsidiaries(item).length || isAerosol(item) ? "Division 2.2 is authorized only with no subsidiary hazard and not as an aerosol (§ 173.4a(b)(1))." : true;
    if (cls === "3") return true;
    if (cls === "4") return pg === "I" ? "Class 4 is authorized only in PG II and III (§ 173.4a(b)(3))." : isSelfReactive(item) ? "Self-reactive materials are not authorized (§ 173.4a(b)(3))." : true;
    if (div === "5.1") return pg === "I" ? "Division 5.1 is authorized only in PG II and III (§ 173.4a(b)(4))." : true;
    if (div === "5.2") return "check";
    if (div === "6.1") return pg === "I" && item.provisionCodes.some((c) => c === "1" || c === "2") ? "Division 6.1, PG I, Hazard Zone A or B is not authorized (§ 173.4a(b)(6))." : true;
    if (cls === "7") return "Class 7 is authorized only as radioactive material in excepted packages (§ 173.4a(b)(7)).";
    if (cls === "8") return pg === "I" ? "Class 8 is authorized only in PG II and III (§ 173.4a(b)(8))." : ["UN2803", "UN2809"].includes(item.un) ? "UN2803 (gallium) and UN2809 (mercury) are not authorized (§ 173.4a(b)(8))." : true;
    if (cls === "9") return item.un === "UN1845" || LITHIUM_BATTERIES.includes(item.un) ? "Dry ice (UN1845) and lithium batteries and cells are not authorized (§ 173.4a(b)(9))." : true;
    return `Class ${div} is not among the authorized classes (§ 173.4a(b)).`;
  })();
  if (typeof allowed === "string" && allowed !== "check") return no(T, cite, allowed);

  const notes = [
    "Packaging: inner receptacle → intermediate packaging with cushioning (and absorbent for liquids) → strong rigid outer packaging; drop and stacking tests apply (§ 173.4a(e)–(f)).",
    "For more than one material in an outer packaging, the lowest permitted aggregate quantity applies (§ 173.4a(d)).",
  ];
  if (div === "2.2") {
    return card(T, cite, { status: "permitted", summary: "Authorized as an excepted quantity.", rows: [{ label: "Gas", inner: "30 mL water capacity", outer: "1 L" }], notes });
  }
  const toxic12 = anyHazard(item, (h) => division(h) === "6.1") && (pg === "I" || pg === "II");
  const inner = toxic12 ? "1 g or 1 mL" : "30 g or 30 mL";
  if (div === "5.2") {
    return card(T, cite, {
      status: "check",
      summary: "Division 5.2 is authorized only in a chemical kit, first aid kit or polyester resin kit (§ 173.4a(b)(5)).",
      rows: [{ label: "Organic peroxide", inner, outer: "500 g or 500 mL" }],
      notes,
    });
  }
  const outer = { I: "300 g or 300 mL", II: "500 g or 500 mL", III: "1 kg or 1 L" }[pg];
  if (toxic12) notes.unshift("Division 6.1 primary or subsidiary hazard in PG I or II: 1 g / 1 mL per inner packaging (§ 173.4a(c)(1)).");
  return card(T, cite, {
    status: outer ? "permitted" : "check",
    summary: outer ? "Authorized as an excepted quantity within these limits." : "No packing group is assigned; see § 173.4a(d) for the outer packaging limit.",
    rows: [{ label: `Class ${div}${pg ? `, PG ${pg}` : ""}`, inner, outer: outer || "See § 173.4a(d)" }],
    notes,
  });
}

// ---------- 49 CFR limited quantities ----------

const GROUND_LQ = {
  // § 173.150–155 (b): inner packaging limits; packages ≤ 30 kg gross
  "150": { cls: "3", I: { liquid: "0.5 L" }, II: { liquid: "1 L" }, III: { liquid: "5 L" } },
  "151": { cls: "4.1", II: { solid: "1 kg", liquid: "1 L" }, III: { solid: "5 kg", liquid: "5 L" } },
  "152": { cls: "5.1", II: { liquid: "1 L", solid: "1 kg" }, III: { liquid: "5 L", solid: "5 kg" } },
  "153": { cls: "6.1", II: { liquid: "100 mL", solid: "0.5 kg" }, III: { liquid: "5 L", solid: "5 kg" } },
  "154": { cls: "8", II: { liquid: "1 L", solid: "1 kg" }, III: { liquid: "5 L", solid: "5 kg" } },
  "155": { cls: "9", II: { liquid: "1 L", solid: "1 kg" }, III: { liquid: "5 L", solid: "5 kg" } },
};

function cfrGroundLimitedQuantity(item) {
  const T = "Limited quantity — ground";
  const exc = item.raw.pkgExceptions;
  const cite = /^\d+[a-z]?$/.test(exc) ? `49 CFR 173.${exc}` : "49 CFR 172.101 column (8A)";
  if (!exc || exc === "None") return no(T, cite, "Column (8A) lists no packaging exceptions, so there is no limited quantity provision.");
  const notes = ["Combination packaging in a strong outer packaging; package ≤ 30 kg (66 lb) gross. Mark with the limited quantity mark (§ 172.315)."];
  const state = physicalState(item);
  const pg = item.pg;

  if (exc === "306") {
    return card(T, cite, {
      status: "permitted",
      summary: "Compressed gases: see § 173.306(a) for the limited quantity packagings.",
      rows: [
        { label: "Containers (except lighters)", inner: "≤ 4 fl oz (120 mL) capacity", outer: "30 kg gross" },
        { label: "Metal aerosol containers", inner: "≤ 1 L capacity", outer: "30 kg gross" },
      ],
      notes,
    });
  }
  const table = GROUND_LQ[exc];
  if (!table) {
    return card(T, cite, { status: "check", summary: `Exceptions for this entry are in § 173.${exc}; check that section for limited quantity provisions.`, notes: [] });
  }
  if (exc === "151" && division(item.hazardClass) !== "4.1") {
    return card(T, cite, { status: "check", summary: `§ 173.151 has separate limited quantity provisions for Division ${division(item.hazardClass)}; check that section.`, notes });
  }
  if (exc === "153" && isPIH(item)) return no(T, cite, "Limited quantity exceptions do not apply to poison-by-inhalation materials (§ 173.153(b)).");
  if (exc === "152" && division(item.hazardClass) === "5.2") {
    return card(T, cite, {
      status: "permitted",
      summary: "Organic peroxides not requiring temperature control (§ 173.152(b)(3)).",
      rows: [
        { label: "Types B or C — liquid / solid", inner: "25 mL / 100 g", outer: "30 kg gross" },
        { label: "Types D, E or F — liquid / solid", inner: "125 mL / 500 g", outer: "30 kg gross" },
      ],
      notes,
    });
  }
  const byPg = table[pg];
  if (!byPg) return no(T, cite, `§ 173.${exc}(b) provides limited quantities only for PG ${Object.keys(table).filter((k) => k !== "cls").join(" and ")}.`);
  const states = state === "unknown" ? Object.keys(byPg) : Object.keys(byPg).filter((s) => s === state);
  const rows = (states.length ? states : Object.keys(byPg)).map((s) => ({ label: s[0].toUpperCase() + s.slice(1), inner: byPg[s], outer: "30 kg gross" }));
  return card(T, cite, { status: "permitted", summary: "Limited quantity packagings authorized for transportation other than by aircraft.", rows, notes });
}

const AIR_CLASS9 = ["UN1941", "UN1990", "UN2071", "UN3077", "UN3082", "UN3316", "UN3334", "UN3335", "ID8000"];

function cfrAirLimitedQuantity(item) {
  const T = "Limited quantity — aircraft";
  const cite = "49 CFR 173.27(f), Table 3";
  const div = division(item.hazardClass);
  const cls = classNum(item.hazardClass);
  const pg = item.pg;
  const state = physicalState(item);
  const sub = (d) => hasSubsidiaryDiv(item, d) || hasSubsidiaryClass(item, d);
  const notes = [
    "Package ≤ 30 kg gross; secondary closure for liquids; 1.2 m drop and 3 m stacking tests; mark with the limited quantity “Y” mark (§ 173.27(f)(2)).",
  ];

  if (!div || item.forbidden || item.raw.qtyPassenger === "Forbidden")
    return no(T, cite, "Must be authorized aboard passenger aircraft (column 9A) to ship as a limited quantity by air.");
  if (item.raw.pkgExceptions === "None") return no(T, cite, "No packaging exceptions are listed in column (8A).");
  if (pg === "I") return no(T, cite, "Packing Group I is not authorized (§ 173.27(f)(2)(i)(A)).");
  if (cls === "1") return no(T, cite, "Class 1 is not authorized; see § 173.63(b) for certain Division 1.4S articles.");
  if (cls === "7") return no(T, cite, "Class 7 is not authorized; see §§ 173.421–173.425.");
  if (div === "2.3") return no(T, cite, "Division 2.3 is not authorized.");
  if (cls === "2") {
    const ok = (["UN1950", "UN2037"].includes(item.un) && !subsidiaries(item).length) || ["UN3478", "UN3479"].includes(item.un);
    if (!ok) return no(T, cite, "Only aerosols (UN1950) and small receptacles (UN2037) without a subsidiary risk, and fuel cell cartridges (UN3478, UN3479), are authorized in Class 2.");
    return card(T, cite, { status: "permitted", summary: "Authorized as a limited quantity by aircraft.", rows: [{ label: "Class 2", inner: "—", outer: "30 kg gross" }], notes });
  }
  if (div === "4.2" || sub("4.2")) return no(T, cite, "Division 4.2 (primary or subsidiary) is not authorized.");
  if (div === "4.1" && (isSelfReactive(item) || ["UN2555", "UN2556", "UN2557", "UN2907"].includes(item.un)))
    return no(T, cite, "Self-reactive Division 4.1 materials and UN2555, UN2556, UN2557, UN2907 are not authorized.");
  if (div === "4.3" && state === "liquid") return no(T, cite, "Division 4.3 liquids are not authorized.");
  if (["UN2794", "UN2795", "UN2803", "UN2809", "UN3028", "UN3506"].includes(item.un)) return no(T, cite, `${item.un} is not authorized.`);
  if (cls === "9" && !AIR_CLASS9.includes(item.un)) return no(T, cite, "Only UN1941, UN1990, UN2071, UN3077, UN3082, UN3316, UN3334, UN3335 and ID8000 are authorized in Class 9.");

  if (!pg && cls !== "9" && div !== "5.2") return card(T, cite, { status: "check", summary: "No packing group is assigned; check § 173.27(f) Table 3.", notes });

  const R = (label, inner, outer) => ({ label, inner, outer });
  let rows = [];
  if (cls === "3") {
    rows = pg === "II"
      ? [R("Liquid", "0.5 L", sub("8") ? "0.5 L" : "1 L")]
      : [R("Liquid", sub("8") || sub("6.1") ? "1 L" : "2.5 L glass/fiber; 5 L metal/plastic", sub("8") ? "1 L" : sub("6.1") ? "2 L" : "10 L")];
  } else if (div === "4.1") {
    rows = pg === "II" ? [R("Solid", "0.5 kg", sub("6.1") ? "1 kg" : "5 kg")] : [R("Solid", "1 kg", sub("8") ? "5 kg" : "10 kg")];
  } else if (div === "4.3") {
    rows = pg === "II" ? [R("Solid", "0.5 kg", sub("6.1") ? "1 kg" : "5 kg")] : [R("Solid", "1 kg", sub("8") || sub("4.1") ? "5 kg" : "10 kg")];
  } else if (div === "5.1") {
    rows = pg === "II"
      ? [R("Liquid", "0.1 L", "0.5 L"), R("Solid", "0.5 kg", sub("6.1") ? "1 kg" : "2.5 kg")]
      : [R("Liquid", "0.5 L", "1.0 L"), R("Solid", "1.0 kg", sub("8") ? "1 kg" : "10 kg")];
  } else if (div === "5.2") {
    return card(T, cite, {
      status: "check",
      summary: "Only Types D, E and F as part of a chemical or first aid kit (UN3316) or polyester resin kit (UN3269).",
      rows: [R("Liquid", "30 mL", "1 kg"), R("Solid", "100 g", "1 kg")],
      notes,
    });
  } else if (div === "6.1") {
    rows = pg === "II"
      ? [R("Liquid", "0.1 L", sub("8") ? "0.5 L" : "1.0 L"), R("Solid", "0.5 kg", "1.0 kg")]
      : [R("Liquid", "0.5 L", "2.0 L"), R("Solid", "1.0 kg", "10 kg")];
  } else if (cls === "8") {
    rows = pg === "II"
      ? [R("Liquid", "0.1 L", "0.5 L"), R("Solid", "0.5 kg", item.un === "UN2430" ? "1.0 kg" : "5.0 kg")]
      : [R("Liquid", "0.5 L", "1.0 L"), R("Solid", "1.0 kg", "5.0 kg")];
  } else if (cls === "9") {
    rows = item.un === "UN3316"
      ? [R("Kit — liquid / solid", "30 mL / 100 g", "1 kg")]
      : item.un === "ID8000"
        ? [R("Consumer commodity", "See § 173.167", "30 kg gross")]
        : [R("Liquid", "5.0 L", "30 kg gross"), R("Solid", "5.0 kg", "30 kg gross")];
  } else {
    return card(T, cite, { status: "check", summary: "Table 3 has no row for this class; check § 173.27(f).", notes });
  }
  if (state !== "unknown") {
    const matching = rows.filter((r) => !/^(Liquid|Solid)$/.test(r.label) || r.label.toLowerCase() === state);
    if (matching.length) rows = matching;
  }
  if (subsidiaries(item).length) notes.unshift("Outer limits reflect Table 3's subsidiary-risk footnotes where they apply.");
  return card(T, cite, { status: "permitted", summary: "Authorized as a limited quantity by aircraft within these limits.", rows, notes });
}

export const cfrLimitedQuantity = (item) => [cfrGroundLimitedQuantity(item), cfrAirLimitedQuantity(item)];
