// Shipper's declaration / shipping paper helpers.
//
// AFMAN 24-604: DAF Form 7507, Shipper's Declaration for Dangerous Goods.
// 49 CFR: shipping papers, Part 172 Subpart C (§§ 172.200–172.205) and § 172.604 emergency response number.

import { checkLoad } from "./compatibility";
import { division } from "./quantities";
import { ergFor, isTollFree } from "./erg";

export const PACKAGE_TYPES = [
  "Fiberboard box (4G)",
  "Wooden box (4C1)",
  "Plywood box (4D)",
  "Steel box (4A)",
  "Solid plastic box (4H2)",
  "Steel drum (1A1)",
  "Steel drum, removable head (1A2)",
  "Plastic drum (1H1)",
  "Plastic drum, removable head (1H2)",
  "Fiber drum (1G)",
  "Steel jerrican (3A1)",
  "Plastic jerrican (3H1)",
  "Composite packaging (6HG2)",
  "Composite packaging (6HA1)",
  "Cylinder",
  "Overpack",
];

export const UNITS = {
  kg: { label: "kg", dim: "mass", toBase: 1 },
  "kg G": { label: "kg G (gross)", dim: "mass", toBase: 1 },
  g: { label: "g", dim: "mass", toBase: 0.001 },
  lb: { label: "lb", dim: "mass", toBase: 0.45359237 },
  L: { label: "L", dim: "volume", toBase: 1 },
  mL: { label: "mL", dim: "volume", toBase: 0.001 },
  gal: { label: "gal", dim: "volume", toBase: 3.785411784 },
};

export const CFR_MODES = {
  highway: "Highway",
  rail: "Rail",
  vessel: "Vessel",
  airPax: "Air — passenger and cargo aircraft",
  airCao: "Air — cargo aircraft only",
};
export const isAir = (decl) => decl.mode === "airPax" || decl.mode === "airCao";

export const CERTIFICATIONS = {
  // DAF Form 7507 (20250131) certification, as printed on the form.
  afman:
    "I hereby declare that the contents of this consignment are fully and accurately described above by the proper shipping name, and are classified, packaged, marked, and labeled/placarded, and are in all respects in proper condition for transport according to applicable international and national government regulations.  I declare that all of the applicable air transport requirements have been met.",
  cfr: "This is to certify that the above-named materials are properly classified, described, packaged, marked and labeled, and are in proper condition for transportation according to the applicable regulations of the Department of Transportation.",
  cfrAir: "I declare that all of the applicable air transport requirements have been met.",
};

export const blankDeclaration = (regKey) => ({
  shipper: "",
  shipperPhone: "",
  shipperDsn: "",
  airWaybill: "",
  consignee: "",
  carrier: "",
  // 49 CFR: TCN (AFMAN keeps its TCN in `reference`)
  tcn: "",
  reference: "",
  date: new Date().toISOString().slice(0, 10),
  mode: regKey === "afman" ? "airPax" : "highway",
  departure: "",
  destination: "",
  radioactive: false,
  international: false,
  emergencyPhone: "",
  emergencyContact: "",
  // undefined = fill automatically from the ERG guides of the materials added
  emergencyInfo: undefined,
  // DAF Form 7507: print the ERG guide lines under Additional Handling Information
  ergOnForm: false,
  additionalInfo: "",
  signatory: "",
  signatoryTitle: "",
  place: "",
  certification: CERTIFICATIONS[regKey === "afman" ? "afman" : "cfr"],
  lines: [],
});

export const newLine = (item, regKey) => ({
  id: item.id,
  technicalName: "",
  packages: "1",
  packageType: PACKAGE_TYPES[0],
  quantity: "",
  unit: /\bSOLID\b/i.test(item.name) ? "kg" : "L",
  packing: regKey === "afman" ? item.raw.PackingPara || "" : item.raw.pkgNonBulk && /^\d/.test(item.raw.pkgNonBulk) ? `§173.${item.raw.pkgNonBulk}` : "",
  authorization: "",
  netExplosive: "",
  rq: false,
  limitedQuantity: false,
  waste: false,
});

// ---------- descriptions ----------

const ZONES = { 1: "A", 2: "B", 3: "C", 4: "D" };
export const inhalationZone = (item) => {
  for (const c of item.provisionCodes) if (ZONES[c]) return ZONES[c];
  return undefined;
};

export const subsidiaries = (item) =>
  (item.subsidiaryHazards || []).filter((s) => /^\d/.test(s) && division(s) !== division(item.hazardClass));

export const technicalNameRequired = (item, regKey) =>
  regKey === "afman" ? (item.symbols || "").includes("✭") : (item.symbols || "").includes("G");

export const shippingName = (line, item) =>
  `${line.waste ? "Waste " : ""}${item.name}${line.technicalName.trim() ? ` (${line.technicalName.trim()})` : ""}`;

export const classText = (item) => {
  const subs = subsidiaries(item);
  return `${item.hazardClass}${subs.length ? ` (${subs.join(", ")})` : ""}`;
};

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};
const fmt = (n) => (Math.round(n * 1000) / 1000).toLocaleString();

export const totalQuantity = (line) => {
  const p = num(line.packages);
  const q = num(line.quantity);
  return p && q ? `${fmt(p * q)} ${line.unit}` : "";
};

/** "2 Fiberboard box (4G) × 1 L" */
export const packagesText = (line) => {
  const p = num(line.packages);
  const q = num(line.quantity);
  if (!p) return "";
  return `${p} ${line.packageType}${q ? ` × ${fmt(q)} ${line.unit}` : ""}`;
};

/** 49 CFR basic description in § 172.202 order, with RQ in front (§ 172.203(c)). */
export const basicDescription = (line, item) =>
  [line.rq && "RQ", item.un, shippingName(line, item), classText(item), item.pg && `PG ${item.pg}`].filter(Boolean).join(", ");

/** Additional entries required by § 172.203 / AFMAN for this line. */
export const additionalDescription = (line, item, decl) => {
  const out = [];
  const zone = inhalationZone(item);
  const d = division(item.hazardClass);
  if (zone && (d === "2.3" || d === "6.1")) out.push(`${d === "2.3" ? "Toxic" : "Poison"}-Inhalation Hazard, Zone ${zone}`);
  if (line.limitedQuantity) out.push("Limited Quantity");
  if (division(item.hazardClass)?.[0] === "1" && line.netExplosive) out.push(`NEW ${line.netExplosive} kg`);
  if (decl.mode === "airCao" || (decl.mode === "airPax" && item.cargoOnly)) out.push("Cargo Aircraft Only");
  return out;
};

// ---------- checks ----------

export const parseLimit = (s) => {
  const m = /^([\d.]+)\s*(kg|L|g|mL)\b/i.exec((s || "").trim());
  if (!m) return null;
  const unit = Object.keys(UNITS).find((u) => u.toLowerCase() === m[2].toLowerCase());
  return { value: parseFloat(m[1]) * UNITS[unit].toBase, dim: UNITS[unit].dim, text: s.trim() };
};

/**
 * @returns [{ level: "error" | "warn", text }]
 */
export function checkDeclaration(decl, items, regKey, substances = [], erg = null) {
  const issues = [];
  const add = (level, text) => issues.push({ level, text });
  const lines = decl.lines.map((l) => ({ line: l, item: items[l.id] })).filter((x) => x.item);

  if (!decl.shipper.trim()) add("error", "Enter the shipper's name and address.");
  if (!decl.consignee.trim()) add("error", "Enter the consignee's name and address.");
  if (!lines.length) add("error", "Add at least one hazardous material.");
  if (!decl.emergencyPhone.trim())
    add("error", regKey === "afman" ? "Enter a 24-hour emergency response telephone number." : "Enter a 24-hour emergency response telephone number (§ 172.604).");
  if (decl.international && isTollFree(decl.emergencyPhone))
    add(
      "warn",
      "International shipment: a toll-free (1-800) number usually can't be dialled from outside the U.S. Add a 24-hour number that can be reached from every country on the route."
    );
  if (!decl.signatory.trim()) add("error", "Enter the name of the person signing the certification.");

  const substanceMap = new Map(substances.map((s) => [s.substance.toLowerCase(), s]));

  lines.forEach(({ line, item }, n) => {
    const label = `Line ${n + 1} (${item.un || item.name})`;
    if (item.forbidden) add("error", `${label}: this entry is forbidden for transport.`);
    if (item.airForbidden && (isAir(decl) || regKey === "afman")) add("error", `${label}: forbidden on aircraft.`);
    if (technicalNameRequired(item, regKey) && !line.technicalName.trim())
      add("error", `${label}: a technical name is required in parentheses after the shipping name.`);
    if (!num(line.packages)) add("error", `${label}: enter the number of packages.`);
    if (!num(line.quantity)) add("error", `${label}: enter the quantity per package.`);
    if (division(item.hazardClass)?.[0] === "1" && !line.netExplosive) add("warn", `${label}: enter the net explosive weight (NEW) for Class 1.`);
    if (regKey === "afman" && item.cargoOnly && decl.mode === "airPax")
      add("error", `${label}: this entry is limited to cargo aircraft only (special provisions ${item.provisionCodes.filter((c) => /^P[1-4]$/.test(c)).join(", ")}). Select "Cargo aircraft only".`);

    if (regKey === "cfr" && isAir(decl)) {
      const limitText = decl.mode === "airPax" ? item.raw.qtyPassenger : item.raw.qtyCargo;
      const where = decl.mode === "airPax" ? "passenger aircraft" : "cargo aircraft";
      if (limitText === "Forbidden") add("error", `${label}: forbidden on ${where} (§ 172.101 column 9).`);
      const limit = parseLimit(limitText);
      const q = num(line.quantity);
      const unit = UNITS[line.unit];
      if (limit && q && unit.dim === limit.dim && q * unit.toBase > limit.value + 1e-9)
        add("error", `${label}: ${fmt(q)} ${line.unit} per package exceeds the ${where} limit of ${limit.text}.`);
    }

    if (erg && item.un && !ergFor(erg, item))
      add("warn", `${label}: ${item.un} is not listed in the ${erg.edition}. Enter emergency response information for it yourself.`);

    const sub = substanceMap.get(item.name.toLowerCase()) || substanceMap.get(line.technicalName.trim().toLowerCase());
    if (sub && !line.rq)
      add("warn", `${label}: ${sub.substance} is a listed hazardous substance (RQ ${sub.lbs} lb / ${sub.kg} kg). Mark "RQ" if a package contains at least that amount.`);
  });

  const mode = regKey === "afman" ? "afman2" : decl.mode === "highway" ? "cfrHighway" : isAir(decl) ? "cfrAir" : null;
  if (mode && lines.length > 1) {
    const { pairs } = checkLoad(lines.map(({ item }, i) => ({ key: i, item })), mode);
    pairs
      .filter((p) => ["X", "O", "cargo"].includes(p.level))
      .forEach((p) =>
        add(p.level === "X" ? "error" : "warn", `Compatibility: ${p.a.item.un} and ${p.b.item.un} — ${p.reasons[0].text} (${p.reasons[0].cite})`)
      );
  }
  return issues;
}
