// Emergency Response Guidebook (ERG2024) lookups for the shipper's declaration.
//
// src/data-file/erg.json is generated from the official ERG2024 PDF by
// scripts/parse_erg.py: every entry in the yellow section (ID number → guide),
// whether it is highlighted green (toxic inhalation hazard: Table 1 isolation and
// protective action distances apply), and each orange guide's title.

let ergPromise;
/** Loads the ERG data once, as its own chunk. */
export const loadErg = () => {
  if (!ergPromise) {
    ergPromise = import("../data-file/erg.json").then((m) => {
      const data = m.default || m;
      const byId = new Map();
      data.entries.forEach((e) => {
        if (!byId.has(e.id)) byId.set(e.id, []);
        byId.get(e.id).push(e);
      });
      return { ...data, byId };
    });
    ergPromise.catch(() => {
      ergPromise = undefined;
    });
  }
  return ergPromise;
};

/** "UN1203" / "NA1993" / "ID8000" / "1203" → "1203". */
export const idNumber = (un) => (/(\d{4})\s*$/.exec(un || "") || [])[1];

const words = (s) =>
  new Set(
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((w) => w.length > 2)
  );
const overlap = (a, b) => {
  const A = words(a);
  const B = words(b);
  let n = 0;
  A.forEach((w) => B.has(w) && n++);
  return n / Math.max(1, Math.max(A.size, B.size));
};

/**
 * ERG guidance for one table entry. When an ID number lists more than one guide
 * (e.g. UN1993 or entries that differ by name), the entry whose name best
 * matches the shipping name is used.
 * @returns {{ id, guide, title, tih, name, alternatives: string[] } | null}
 */
export function ergFor(erg, item) {
  const id = idNumber(item?.un);
  const entries = (id && erg?.byId.get(id)) || [];
  if (!entries.length) return explosiveGuide(erg, item, id);
  const name = item.name || "";
  const best = [...entries].sort((a, b) => overlap(b.name, name) - overlap(a.name, name))[0];
  const guideNo = best.guide.replace(/P$/, "");
  return {
    id,
    guide: best.guide,
    title: erg.guides[guideNo] || "",
    tih: entries.some((e) => e.tih && (e === best || e.guide === best.guide)),
    name: best.name,
    alternatives: [...new Set(entries.map((e) => e.guide))].filter((g) => g !== best.guide),
  };
}

// The ERG does not list Class 1 by ID number; its yellow section has two rows
// instead: "Explosives, division 1.1, 1.2, 1.3 or 1.5" → Guide 112 and
// "Explosives, division 1.4 or 1.6" → Guide 114.
const EXPLOSIVE_GUIDES = { "1.1": "112", "1.2": "112", "1.3": "112", "1.5": "112", "1.4": "114", "1.6": "114" };
function explosiveGuide(erg, item, id) {
  const division = (/^(1\.[1-6])/.exec(item?.hazardClass || "") || [])[1];
  const guide = erg && EXPLOSIVE_GUIDES[division];
  if (!guide) return null;
  return { id, guide, title: erg.guides[guide] || "", tih: false, name: `Explosives, division ${division}`, alternatives: [] };
}

/** One line per distinct ID number, in the order the materials were added. */
export function ergText(erg, items) {
  const seen = new Set();
  const out = [];
  items.forEach((item) => {
    const info = ergFor(erg, item);
    if (!info || seen.has(`${item.un}|${info.guide}`)) return;
    seen.add(`${item.un}|${info.guide}`);
    out.push(
      `${item.un}: ${erg.edition} Guide ${info.guide}${info.title ? ` — ${info.title}` : ""}` +
        (info.guide.endsWith("P") ? " (may polymerize)" : "") +
        (info.tih ? "; toxic inhalation hazard — use Table 1 initial isolation and protective action distances" : "")
    );
  });
  return out.join("\n");
}

// ERG2024 "24-hour emergency response telephone numbers" (last page), item 5:
// "MILITARY SHIPMENTS, for assistance at incidents involving materials being
// shipped by, for, or to the Department of Defense (DOD)".
export const DOD_EMERGENCY = {
  explosives: { phone: "703-695-4695/4696", agency: "U.S. Army Operations Center", scope: "explosives/ammunition" },
  other: { phone: "1-800-851-8061", agency: "Defense Logistics Agency", scope: "all other hazardous materials" },
};

/** Class 1 by division, or by ID number range (UN0001–UN0999 are explosives). */
export const isExplosive = (item) =>
  /^1(\.|$)/.test(item?.hazardClass || "") || /^(UN|NA)0\d{3}$/.test(item?.un || "");

/** A non-Class 1 entry with an explosive subsidiary hazard (e.g. organic peroxide type B, UN3101). */
export const hasExplosiveSubsidiary = (item) => (item?.subsidiaryHazards || []).some((s) => /^1(\.|$)/.test(s));

/** The Army number accepts collect calls, so it can be given in international form. */
const ARMY_INTL = "+1-703-695-4695/4696 (collect calls accepted)";
const TOLL_FREE = /(^|[^\d])1-?8(00|88|77|66|55|44|33)-/;
export const isTollFree = (phone) => TOLL_FREE.test(phone || "");

/**
 * DoD 24-hour emergency phone and agency for the materials on a declaration:
 * the Army Operations Center for explosives/ammunition, DLA for everything
 * else, and both (labelled) when the load, or a single entry with an explosive
 * subsidiary hazard, involves both. Empty strings for no materials.
 * With `international`, the Army number is given in +1 form.
 */
export function emergencyContacts(items, { international = false } = {}) {
  const explosive = items.some((i) => isExplosive(i) || hasExplosiveSubsidiary(i));
  const other = items.some((i) => !isExplosive(i));
  const kinds = [];
  if (explosive) kinds.push({ ...DOD_EMERGENCY.explosives, phone: international ? ARMY_INTL : DOD_EMERGENCY.explosives.phone });
  if (other) kinds.push(DOD_EMERGENCY.other);
  if (kinds.length === 0) return { phone: "", contact: "" };
  if (kinds.length === 1) return { phone: kinds[0].phone, contact: `${kinds[0].agency} (DoD)` };
  return {
    phone: kinds.map((k) => `${k.phone} (${k.scope})`).join("; ").replace("(collect calls accepted) (explosives/ammunition)", "(explosives/ammunition, collect calls accepted)"),
    contact: kinds.map((k) => `${k.agency} (${k.scope})`).join("; "),
  };
}
