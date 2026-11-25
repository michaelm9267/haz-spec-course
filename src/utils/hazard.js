import HC from "../data-file/hazardClasses.json";

/** Prefix a public-folder path so it works when deployed under a sub-path (e.g. GitHub Pages). */
export const assetUrl = (path) =>
  `${process.env.PUBLIC_URL}/${path.replace(/^\//, "")}`;

/**
 * Look up hazard class info for a class code such as "3", "6.1" or "1.1D".
 * Explosive compatibility-group letters are ignored, and common OCR typos
 * in the AFMAN source data ("6.l", "4. 2", "2.2.") are normalised.
 */
export const getHazardClass = (code) => {
  if (!code) return undefined;
  const normalised = code.replace(/\s/g, "").replace(/l/g, "1");
  const match = normalised.match(/^\d(\.\d)?/);
  if (!match) return undefined;
  return HC.HazardClasses.find((hc) => hc.Class === match[0]);
};

/** "6.1, 6.1, 8" -> ["6.1", "8"] (de-duplicated, blanks removed). */
export const splitList = (value) =>
  [...new Set((value || "").split(",").map((s) => s.trim()).filter(Boolean))];

const normaliseName = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Find the entry in another regulation's item list that best matches `item`:
 * same ID number and name, then same ID number and packing group, then same ID number,
 * then (for entries without an ID number) same name.
 */
export const findEquivalent = (item, items) => {
  const name = normaliseName(item.name);
  if (!item.un) return items.find((i) => normaliseName(i.name) === name);
  const sameUn = items.filter((i) => i.un === item.un);
  return (
    sameUn.find((i) => normaliseName(i.name) === name) ||
    sameUn.find((i) => i.pg && i.pg === item.pg) ||
    sameUn[0]
  );
};

/** Search table entries by UN/ID number or name; prefix matches rank first. */
export function searchItems(items, rawQuery, { limit = 12, filter = (i) => Boolean(i.hazardClass) } = {}) {
  const q = rawQuery.toLowerCase().trim();
  if (!q) return [];
  const starts = [];
  const contains = [];
  for (const i of items) {
    if (!filter(i)) continue;
    const un = (i.un || "").toLowerCase();
    const n = i.name.toLowerCase();
    if (un.startsWith(q) || un.replace(/^(un|na|id)/, "").startsWith(q) || n.startsWith(q)) starts.push(i);
    else if (un.includes(q) || n.includes(q)) contains.push(i);
  }
  return [...starts, ...contains].slice(0, limit);
}
