// Packaging, marking and labeling suggestions for one package of one material.
//
// This applies the general rules to a table entry and what the user says is in the
// package. It can't see the packing paragraph / § 173 section text itself, special
// permits or the actual packaging, so every result is a suggestion to check against
// the regulation, and each one carries its citation.
//
// AFMAN 24-604: packing paragraphs (Attachments 5–13, 27), marking (Attachment 14),
// labeling (Attachment 15), limited quantities (A19.3). The AFMAN wording here
// follows DAF Form 7507's Shipper's Checklist.
// 49 CFR: §§ 172.301–172.338 (marking), 172.400–172.450 (labeling), 173.24–173.27
// (general packaging and air), 178.503 (UN specification marks).

import { inhalationZone, newLine, technicalNameRequired, UNITS, parseLimit } from "./declaration";
import { afmanLimitedQuantity, cfrLimitedQuantity, division, physicalState } from "./quantities";

export const AFMAN_MODES = {
  airPax: "Passenger and cargo aircraft",
  airCao: "Cargo aircraft only",
};
export const CFR_PACK_MODES = {
  highway: "Highway",
  rail: "Rail",
  airPax: "Air — passenger and cargo aircraft",
  airCao: "Air — cargo aircraft only",
};
export const modesFor = (regKey) => (regKey === "afman" ? AFMAN_MODES : CFR_PACK_MODES);
export const isAirMode = (mode) => mode === "airPax" || mode === "airCao";

const classNum = (code) => division(code)?.[0];

/** Gases other than aerosols and small receptacles go in cylinders. */
export const isCylinderGas = (item) => classNum(item.hazardClass) === "2" && !["UN1950", "UN2037", "UN3478", "UN3479"].includes(item.un);

/** Liquid / solid / gas, from the shipping name where it says so. */
export const defaultState = (item) => {
  if (isCylinderGas(item)) return "gas";
  const s = physicalState(item);
  if (s !== "unknown") return s;
  return classNum(item.hazardClass) === "3" || /\bACID\b|SOLUTION|MIXTURE/i.test(item.name) ? "liquid" : "solid";
};

// ---------- containers ----------
// kind: "combination" = inner receptacles inside this outer packaging; "single" = the
// material goes straight in. UN codes per 49 CFR 178.502 (1 drum, 3 jerrican, 4 box,
// 6 composite; A steel, H plastic, G fiber, C wood; 1 = closed head, 2 = open head).
export const CONTAINERS = {
  "4G": { declarationType: "Fiberboard box (4G)", code: "4G", name: "Fiberboard box", kind: "combination", shape: "box", material: "fiberboard", states: ["liquid", "solid"] },
  "4C1": { declarationType: "Wooden box (4C1)", code: "4C1", name: "Wooden box", kind: "combination", shape: "box", material: "wood", states: ["liquid", "solid"] },
  "4H2": { declarationType: "Solid plastic box (4H2)", code: "4H2", name: "Solid plastic box", kind: "combination", shape: "box", material: "plastic", states: ["liquid", "solid"] },
  "1A2o": { declarationType: "Steel drum, removable head (1A2)", code: "1A2", name: "Steel drum, open head (outer)", kind: "combination", shape: "drum", material: "steel", states: ["liquid", "solid"] },
  "1H2o": { declarationType: "Plastic drum, removable head (1H2)", code: "1H2", name: "Plastic drum, open head (outer)", kind: "combination", shape: "drum", material: "plastic", states: ["liquid", "solid"] },
  "1Go": { declarationType: "Fiber drum (1G)", code: "1G", name: "Fiber drum (outer)", kind: "combination", shape: "drum", material: "fiber", states: ["liquid", "solid"] },
  "1A1": { declarationType: "Steel drum (1A1)", code: "1A1", name: "Steel drum, closed head", kind: "single", shape: "drum", material: "steel", states: ["liquid"] },
  "1H1": { declarationType: "Plastic drum (1H1)", code: "1H1", name: "Plastic drum, closed head", kind: "single", shape: "drum", material: "plastic", states: ["liquid"] },
  "3A1": { declarationType: "Steel jerrican (3A1)", code: "3A1", name: "Steel jerrican, closed head", kind: "single", shape: "jerrican", material: "steel", states: ["liquid"] },
  "3H1": { declarationType: "Plastic jerrican (3H1)", code: "3H1", name: "Plastic jerrican, closed head", kind: "single", shape: "jerrican", material: "plastic", states: ["liquid"] },
  "6HA1": { declarationType: "Composite packaging (6HA1)", code: "6HA1", name: "Composite: plastic receptacle in a steel drum", kind: "single", shape: "drum", material: "steel", states: ["liquid"] },
  "1A2": { declarationType: "Steel drum, removable head (1A2)", code: "1A2", name: "Steel drum, open head", kind: "single", shape: "drum", material: "steel", states: ["solid"] },
  "1H2": { declarationType: "Plastic drum, removable head (1H2)", code: "1H2", name: "Plastic drum, open head", kind: "single", shape: "drum", material: "plastic", states: ["solid"] },
  "1G": { declarationType: "Fiber drum (1G)", code: "1G", name: "Fiber drum", kind: "single", shape: "drum", material: "fiber", states: ["solid"] },
  cyl: { declarationType: "Cylinder", code: "", name: "Cylinder", kind: "single", shape: "cylinder", material: "steel", states: ["gas"] },
};

/** Container ids that suit a physical state, combination packagings first. */
export const containersFor = (state) => Object.keys(CONTAINERS).filter((k) => CONTAINERS[k].states.includes(state));

export const defaultContainer = (state) => (state === "gas" ? "cyl" : "4G");

/** The package's container, falling back to the default for its state. */
export const containerOf = (pkg) => {
  const c = CONTAINERS[pkg.container];
  return c && c.states.includes(pkg.state) ? c : CONTAINERS[defaultContainer(pkg.state)];
};

/** A new package for the guide. */
export const newPackage = (item) => {
  const state = defaultState(item);
  return {
    id: item.id,
    state,
    container: defaultContainer(state),
    innerQty: "",
    unit: state === "liquid" ? "L" : "kg",
    inners: "1",
    count: "1",
    netExplosive: "",
    technicalName: "",
    rq: false,
    limitedQuantity: false,
  };
};

// UN performance level for the packing group (49 CFR 178.503(a)(3)): X covers PG I–III, Y covers II–III, Z covers III.
export const PERFORMANCE = { I: "X", II: "Y", III: "Z" };

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Total net quantity in base units (kg or L) and as text. */
export function packageQuantity(pkg) {
  const q = num(pkg.innerQty);
  const n = num(pkg.inners) || 1;
  const unit = UNITS[pkg.unit];
  if (!q || !unit) return null;
  const total = q * n;
  return { base: total * unit.toBase, innerBase: q * unit.toBase, dim: unit.dim, text: `${+total.toFixed(3)} ${pkg.unit}` };
}

const exceeds = (limitText, amount, kind) => {
  const limit = parseLimit(limitText);
  if (!limit || !amount) return null;
  const value = kind === "inner" ? amount.innerBase : amount.base;
  if (limit.dim !== amount.dim) return null;
  return value > limit.value + 1e-9 ? limit.text : false;
};

/** Labels for an entry: primary first, then subsidiaries, de-duplicated by division. */
export function hazardLabels(item, regKey) {
  const primary = item.hazardClass;
  if (!division(primary)) return [];
  const subs = (regKey === "cfr" ? item.labels || [] : item.subsidiaryHazards || []).filter(
    (l) => division(l) && division(l) !== division(primary)
  );
  return [primary, ...new Set(subs)];
}

/**
 * Would this package go as a limited quantity? Uses the entry's limited quantity
 * rules (AFMAN A19.3, or 49 CFR ground / air) and the quantities entered.
 * status: "no" (the entry can't), "over" (it can, but not this package),
 * "noqty" (it can; enter a quantity to check), "check" (it may — the rule needs a
 * judgement the app can't make, or the limit can't be compared), "yes" (within limits).
 */
export function limitedQuantityCheck(item, pkg, { regKey, mode }) {
  const afman = regKey === "afman";
  const air = afman || isAirMode(mode);
  const state = pkg.state || defaultState(item);
  const container = containerOf({ ...pkg, state });
  const single = container.kind === "single";
  const card = afman ? afmanLimitedQuantity(item) : air ? cfrLimitedQuantity(item)[1] : cfrLimitedQuantity(item)[0];
  const row = card.rows.find((r) => r.label.toLowerCase() === state) || (card.rows.length === 1 ? card.rows[0] : null);
  const base = { card, row, air, problems: [] };
  if (card.status === "not-permitted") return { ...base, status: "no" };

  const problems = [];
  if (single)
    problems.push("Limited quantities must be in combination packagings (inner receptacles in an outer packaging), not single packagings. Choose a box or an outer drum to ship as a limited quantity.");
  const quantity = packageQuantity(pkg);
  // a drum or jerrican has no inner receptacles to compare, so the packaging is the problem
  if (single || !quantity) return { ...base, problems, quantity, status: problems.length ? "over" : "noqty" };
  let known = false;
  if (row) {
    const gross = /gross/i.test(row.outer);
    const inner = exceeds(row.inner, quantity, "inner");
    const outer = gross ? null : exceeds(row.outer, quantity, "outer");
    if (inner) problems.push(`Each inner receptacle exceeds the limited quantity limit of ${inner}.`);
    if (outer) problems.push(`The package total (${quantity.text}) exceeds the limited quantity limit of ${outer} per package.`);
    known = inner === false && (gross || outer === false);
  }
  const status = problems.length ? "over" : card.status === "check" || !known ? "check" : "yes";
  return { ...base, problems, quantity, status };
}

/**
 * The suggestion for one package.
 * @returns {{
 *   blocked: string|null,
 *   shape: "box"|"drum"|"jerrican"|"cylinder", container: object, single: boolean,
 *   packaging: {text, cite}[], marks: {key, text, cite}[], labels: {key, code?, text, cite}[],
 *   warnings: string[], notes: string[], lq: object|null, quantity: object|null, cao: boolean
 * }}
 */
export function packagingPlan(item, pkg, { regKey, mode }) {
  const afman = regKey === "afman";
  const air = afman || isAirMode(mode);
  const cls = classNum(item.hazardClass);
  const div = division(item.hazardClass);
  const state = pkg.state || defaultState(item);
  const container = containerOf({ ...pkg, state });
  const cylinder = container.shape === "cylinder";
  const single = container.kind === "single";
  const liquid = state === "liquid";
  const quantity = packageQuantity(single ? { ...pkg, inners: "1" } : pkg);
  const packaging = [];
  const marks = [];
  const labels = [];
  const warnings = [];
  const notes = [];
  const MARK = afman ? "AFMAN 24-604, Attachment 14" : null;
  const LABEL = afman ? "AFMAN 24-604, Attachment 15" : null;

  const plan = (extra = {}) => ({
    blocked: null, shape: container.shape, container, single, packaging, marks, labels, warnings, notes, lq: null, lqSuggestion: null, quantity, cao: false, ...extra,
  });

  // "Comb liq" (49 CFR) / "COMBUSTIB LE LIQUID" (AFMAN, as extracted): no hazard label
  const combustible = !div && /^comb/i.test((item.hazardClass || "").replace(/\s/g, ""));
  if (combustible) {
    warnings.push(
      afman
        ? "Combustible liquid: there is no hazard label for it. Follow the packing paragraph for its packaging and marking."
        : "Combustible liquid: in non-bulk packaging it isn't subject to the HMR unless it is a hazardous substance, hazardous waste or marine pollutant (§ 173.150(f)(2)). Reclassing a Class 3 liquid as combustible doesn't apply by air or vessel (§ 173.150(f)(1))."
    );
  }
  if (!div && !combustible) return plan({ blocked: "This entry has no hazard class (it is a “see” reference or not regulated). Look up the entry it points to." });
  if (item.forbidden) return plan({ blocked: afman ? "Forbidden for air transport (Table A4.1)." : "Forbidden for transportation (§ 172.101 column 3)." });
  if (!afman && air && item.airForbidden) return plan({ blocked: "Forbidden on both passenger and cargo aircraft (§ 172.101 columns 9A and 9B). Ship by ground." });

  // ---------- limited quantity ----------
  const lqCheck = limitedQuantityCheck(item, pkg, { regKey, mode });
  let lq = null;
  if (pkg.limitedQuantity) {
    const { card } = lqCheck;
    if (lqCheck.status === "no") {
      warnings.push(`Not eligible as a limited quantity: ${card.summary} The suggestions below are for a fully regulated package.`);
      lq = { ...card, applies: false };
    } else if (lqCheck.status === "over") {
      warnings.push(...lqCheck.problems);
      lq = { ...card, applies: false };
    } else {
      lq = { ...card, applies: true };
      if (card.status === "check") notes.push(`Limited quantity: ${card.summary}`);
    }
  }
  const isLq = Boolean(lq?.applies);

  // ---------- aircraft limits (49 CFR column 9) ----------
  let cao = Boolean(item.cargoOnly) && air;
  if (!afman && air && !isLq) {
    if (mode === "airPax" && item.raw.qtyPassenger === "Forbidden") {
      warnings.push("Forbidden on passenger aircraft (column 9A). Ship on cargo aircraft only, with the Cargo Aircraft Only label.");
      cao = true;
    }
    const paxOver = item.raw.qtyPassenger !== "Forbidden" && exceeds(item.raw.qtyPassenger, quantity, "outer");
    const caoOver = exceeds(item.raw.qtyCargo, quantity, "outer");
    if (caoOver) warnings.push(`${quantity.text} exceeds the cargo aircraft limit of ${caoOver} per package (column 9B). Split it into more packages.`);
    else if (paxOver) {
      cao = true;
      if (mode === "airPax") warnings.push(`${quantity.text} exceeds the passenger aircraft limit of ${paxOver} per package (column 9A): ship on cargo aircraft only, or split it into smaller packages.`);
      else notes.push(`Over the passenger aircraft limit of ${paxOver}, so the package needs the Cargo Aircraft Only label.`);
    }
  }
  if (afman && item.cargoOnly && mode === "airPax")
    warnings.push("This entry is Cargo Aircraft Only (special provision P1–P4). It can't go on a passenger aircraft.");

  // ---------- packaging ----------
  const pg = item.pg;
  const perf = PERFORMANCE[pg];
  if (afman) {
    packaging.push({
      text: `Pack according to packing paragraph ${(item.raw.PackingPara || "").replace(/\.$/, "") || "— (none listed)"}: it sets the authorized inner and outer packagings and the quantity limits.`,
      cite: "AFMAN 24-604, Attachments 5–13 or 27",
    });
  } else {
    const nb = item.raw.pkgNonBulk;
    if (/^\d+[a-z]?$/.test(nb)) packaging.push({ text: `Authorized non-bulk packagings are in § 173.${nb}.`, cite: "§ 172.101 column 8B" });
    if (/^\d+[a-z]?$/.test(item.raw.pkgExceptions) && !isLq)
      notes.push(`Packaging exceptions (including limited quantity) are in § 173.${item.raw.pkgExceptions}.`);
  }

  if (cylinder) {
    packaging.push({
      text: "Use a DOT- or UN-specification cylinder authorized for this gas, filled no higher than its marked service pressure, with the valve protected by a cap, collar or a strong outer packaging.",
      cite: afman ? "AFMAN 24-604 packing paragraph" : "§ 173.301",
    });
  } else if (isLq) {
    packaging.push({
      text: `Combination packaging: inner receptacles in a strong outer packaging (it doesn't need to be UN-specification), no more than 30 kg (66 lb) gross${air ? ", and able to pass a 1.2 m drop and 3 m stacking test" : ""}.`,
      cite: afman ? "AFMAN 24-604, A19.3" : air ? "§ 173.27(f)(2)" : "§§ 173.150–173.155",
    });
  } else if (single) {
    packaging.push({
      text: `Single packaging: ${container.name.toLowerCase()} (${container.code}), UN-specification${perf ? ` and tested to performance level ${perf} or better (PG ${pg})` : ""}${liquid ? ", rated for liquids at a specific gravity and test pressure that cover this material" : ""}. Check that ${afman ? "the packing paragraph" : "the § 173 section"} authorizes this single packaging for this material${air ? " — by air many liquids are limited to combination packagings or to smaller single packagings" : ""}.`,
      cite: afman ? "AFMAN 24-604 packing paragraph" : "§§ 173.24, 178.503",
    });
    if (container.material === "plastic")
      notes.push("Plastic drums and jerricans have a limited service life for hazardous materials (generally 5 years from the month of manufacture) unless approved otherwise.");
    if (classNum(item.hazardClass) === "1") notes.push("Explosives need an approved classification (EX number or DoD hazard classification) and the packaging named in it.");
  } else {
    packaging.push({
      text: `Combination packaging: inner receptacles${liquid ? " (closures up)" : ""} cushioned inside a UN-specification ${container.name.toLowerCase().replace(" (outer)", "")} (${container.code})${perf ? ` tested to performance level ${perf} or better (PG ${pg})` : ""}.`,
      cite: afman ? "AFMAN 24-604 packing paragraph; DAF Form 7507 checklist §4" : "§§ 173.24, 178.503",
    });
    if (classNum(item.hazardClass) === "1") notes.push("Explosives need an approved classification (EX number or DoD hazard classification) and the packaging named in it.");
  }
  if (liquid && single) {
    packaging.push({
      text: air
        ? `Fill leaving enough ullage for temperature changes, close the bungs tight${afman ? "" : " and make sure the packaging and closures withstand the pressure differential in § 173.27(c)"}.`
        : "Fill leaving enough ullage that the drum isn't liquid-full at 55 °C, and close the bungs tight.",
      cite: afman ? "AFMAN 24-604 packing paragraph" : air ? "§§ 173.24a(b), 173.27(c)" : "§ 173.24a(b)",
    });
  } else if (liquid && !cylinder) {
    if (air)
      packaging.push({
        text: afman
          ? "Inner receptacles containing liquids must meet the “air eligible” test pressure requirements, with secondary closures (tape or wire) and receptacles upright. Use absorbent material per Attachment 20 or the packaging directive."
          : "Inner receptacles and closures must withstand the pressure differential set in § 173.27(c), closures secured with a secondary means (tape, wire, heat seal), and enough absorbent where required.",
        cite: afman ? "AFMAN 24-604; DAF Form 7507 checklist §3" : "§ 173.27(c)–(e)",
      });
    else packaging.push({ text: "Pack receptacles upright with closures tight and enough cushioning to stop movement; leave ullage so they don't leak from expansion.", cite: "§ 173.24(b), 173.24a" });
  }
  if (quantity)
    packaging.push({
      text: `Net quantity in this package: ${quantity.text}${!single && num(pkg.inners) > 1 ? ` (${num(pkg.inners)} × ${pkg.innerQty} ${pkg.unit})` : ""}.`,
      cite: "",
    });

  // ---------- markings ----------
  const tech = technicalNameRequired(item, regKey);
  const techName = pkg.technicalName.trim();
  const psn = `${item.name}${techName ? ` (${techName})` : tech ? " (technical name)" : ""}`;
  marks.push({
    key: "psn",
    text: `${pkg.rq ? "RQ " : ""}${item.un} ${psn}`,
    detail: `Proper shipping name and ID number${tech ? ", with the technical name in parentheses" : ""}${pkg.rq ? ", with “RQ” for a reportable quantity of a hazardous substance" : ""}.`,
    cite: MARK || (pkg.rq ? "§§ 172.301(a), 172.324" : "§ 172.301(a)"),
  });
  if (tech && !techName) warnings.push("This entry needs a technical name in parentheses after the shipping name: fill in the Technical name field.");
  marks.push({ key: "address", text: "Shipper and consignee name and address", detail: "Name and address of the consignor (shipper) and consignee.", cite: MARK || "§ 172.301(d)" });
  if (cylinder) {
    marks.push({ key: "spec", text: "Cylinder specification marking (stamped)", detail: "The DOT/UN specification, service pressure and retest date stamped on the cylinder shoulder.", cite: afman ? MARK : "§§ 178.35, 180.213" });
  } else if (!isLq) {
    // liquids in single packagings: specific gravity / test pressure (kPa); otherwise gross mass (kg) / S
    const specText = single && liquid ? `${container.code}/${perf || "X"}1.2/150/yy/USA/…` : `${container.code}/${perf || "X"}30/S/yy/USA/…`;
    marks.push({
      key: "spec",
      text: specText,
      detail: `UN specification marking, printed or embossed by the manufacturer${perf ? `: “${perf}” or a higher performance level for PG ${pg}` : ""}${
        single && liquid ? ", then the specific gravity and test pressure it is rated for" : ", then the maximum gross mass and “S”"
      } (the numbers here are examples). Don't add or alter it.`,
      cite: afman ? MARK : "§ 178.503",
    });
  }
  if (liquid && !single) {
    marks.push({ key: "arrows", text: "Orientation arrows (↑↑) on two opposite sides", detail: "Package orientation marking on two opposite vertical sides, arrows pointing up.", cite: MARK || "§ 172.312" });
    if (afman && !isLq) marks.push({ key: "airEligible", text: "AIR ELIGIBLE", detail: "“AIR ELIGIBLE” marking (or symbol) for combination packages containing liquids.", cite: MARK });
  }
  if (isLq) {
    marks.push({
      key: "lq",
      text: air ? "Limited quantity mark with “Y”" : "Limited quantity mark",
      detail: air ? "Limited quantity “Y” mark (black top and bottom, white centre with a black Y): shows the package meets the air limited quantity rules." : "Limited quantity mark: black top and bottom triangles with a white centre.",
      cite: afman ? "AFMAN 24-604, A19.3; Attachment 14" : air ? "§ 172.315(b)" : "§ 172.315(a)",
    });
  }
  const zone = inhalationZone(item);
  if (zone && (div === "2.3" || div === "6.1"))
    marks.push({ key: "inhalation", text: "INHALATION HAZARD", detail: `“INHALATION HAZARD” marking (zone ${zone}), unless the words are already on the label.`, cite: MARK || "§ 172.313(a)" });
  if (air && (div === "5.2" || (div === "4.1" && /SELF-REACTIVE/i.test(item.name))))
    marks.push({ key: "heat", text: "KEEP AWAY FROM HEAT", detail: "Keep Away From Heat handling mark for organic peroxides and self-reactive substances by air.", cite: MARK || "§ 172.317" });
  if (["UN3090", "UN3091", "UN3480", "UN3481"].includes(item.un))
    notes.push("Lithium batteries have their own marking and labeling rules (Class 9 lithium battery label, lithium battery mark in some cases). Check the packing instruction.");

  // ---------- labels ----------
  const labelsNeeded = !(isLq && !air);
  if (!labelsNeeded) {
    notes.push("Limited quantities by highway or rail don't need hazard labels (§ 173.150(b)).");
  } else {
    hazardLabels(item, regKey).forEach((code, i) =>
      labels.push({
        key: `hazard-${code}`,
        code,
        primary: i === 0,
        text: `${i === 0 ? "Primary" : "Subsidiary"} hazard label: ${code}`,
        cite: LABEL || "§§ 172.400, 172.402",
      })
    );
    if (cls === "7") notes.push("Class 7: the label is Radioactive White-I, Yellow-II or Yellow-III depending on surface radiation level and transport index, and needs the contents, activity and TI entered.");
    if (cls === "1") notes.push(`Class 1: the label shows the division and compatibility group (${item.hazardClass}).`);
  }
  if (cao) labels.push({ key: "cao", code: "CAO", text: "Cargo Aircraft Only label", cite: LABEL || "§ 172.402(c)" });
  if (labels.length)
    notes.push(
      `Put the labels on the same side as, and near, the shipping name marking; subsidiary labels next to the primary label${
        cylinder ? ". On a cylinder they can go on the shoulder" : ""
      }.${afman ? "" : " (§ 172.406)"}`
    );

  notes.push(
    "Different hazardous materials can share one outer packaging only when the rules allow it (they must not react with each other); check the packing paragraph and the Compatibility page."
  );

  // not ticked: say whether this UN number and quantity would qualify
  const lqSuggestion = !pkg.limitedQuantity && lqCheck.status !== "no" ? lqCheck : null;
  return plan({ lq, cao, lqSuggestion });
}

// ---------- to the shipper's declaration ----------

/** Net quantity per package as entered (inner quantity × inners, or the single packaging's contents). */
const perPackage = (pkg, single) => {
  const q = num(pkg.innerQty);
  if (!q) return "";
  return String(+(q * (single ? 1 : num(pkg.inners) || 1)).toFixed(3));
};

/**
 * Declaration lines for the packages in the guide. Packages that can't be shipped
 * (forbidden, no hazard class) are left out and returned in `skipped`.
 */
export function declarationLines(packages, items, { regKey, mode }) {
  const lines = [];
  const skipped = [];
  packages.forEach((pkg) => {
    const item = items[pkg.id];
    if (!item) return;
    const plan = packagingPlan(item, pkg, { regKey, mode });
    if (plan.blocked) {
      skipped.push({ item, reason: plan.blocked });
      return;
    }
    lines.push({
      ...newLine(item, regKey),
      technicalName: pkg.technicalName || "",
      packages: String(num(pkg.count) || 1),
      packageType: plan.container.declarationType,
      quantity: perPackage(pkg, plan.single),
      unit: pkg.unit,
      netExplosive: pkg.netExplosive || "",
      rq: Boolean(pkg.rq),
      limitedQuantity: Boolean(plan.lq?.applies),
    });
  });
  return { lines, skipped };
}

/**
 * The declaration with the guide's packages on it: lines replaced (or added), the
 * mode carried over, and "Radioactive" ticked for Class 7. Everything else the user
 * already entered (shipper, consignee, signatory …) is kept.
 */
export function withPackages(decl, packages, items, { regKey, mode, replace = true }) {
  const { lines, skipped } = declarationLines(packages, items, { regKey, mode });
  const all = replace ? lines : [...decl.lines, ...lines];
  const radioactive = all.some((l) => classNum(items[l.id]?.hazardClass) === "7");
  return { decl: { ...decl, mode, lines: all, radioactive: decl.radioactive || radioactive }, added: lines.length, skipped };
}
