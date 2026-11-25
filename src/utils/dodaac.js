// DoDAAC (DoD Activity Address Code) lookup, backed by the SQLite database in
// public/data/DODAACs.sqlite. The site is static (GitHub Pages), so the database
// is downloaded once on first use and queried in the browser with sql.js (SQLite
// compiled to WebAssembly).
//
// The source table (`dodaacs`) is a CSV import with one row per shipment-style
// record, so a DoDAAC appears many times, sometimes with different addresses, and
// a few hundred rows came in with their columns shifted. Every query below keeps
// only well-formed rows and collapses identical addresses, most-used first.

import { assetUrl } from "./hazard";

export const DB_PATH = "data/DODAACs.sqlite";

/** A row is usable when the code is six letters/digits and the address type is a real one. */
const VALID = `length(DODAAC_ID) = 6
  AND upper(DODAAC_ID) GLOB '[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]'
  AND ADDRESS_TYPE IN ('D', 'M')`;

// Columns that identify one physical address. Everything else (phones, ports) is
// taken from that address's most common row.
const ADDRESS_COLS = ["ORGN_NAME", "ORGN_ADDRESS_1", "ORGN_ADDRESS_2", "ORGN_CITY", "ORGN_STATE", "ORGN_ZIP", "ORGN_COUNTRY"];
const EXTRA_COLS = ["APOD", "APOE", "SPOD", "SPOE", "ICAO", "DODAAC_PHONE_NBR", "OVERSEAS_IND"];

export const isDodaac = (s) => /^[A-Z0-9]{6}$/i.test((s || "").trim());

const clean = (v) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());

/** Run a parameterised query and return plain objects. */
const all = (db, sql, params = []) => {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
};

const mostCommon = (values) => {
  const counts = new Map();
  values.filter(Boolean).forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  let best = "";
  counts.forEach((n, v) => {
    if (n > (counts.get(best) || 0)) best = v;
  });
  return best;
};

const PLACEHOLDER_PHONE = /^9{3}-?9{3}-?9{4}$/;

/**
 * Collapse raw rows into distinct addresses (after normalising whitespace and
 * case), most-used first. Ports, ICAO and phone come from each address's most
 * common non-blank value, so a stray shifted row can't override them.
 */
export function groupAddresses(rows) {
  const groups = new Map();
  rows.forEach((r) => {
    const key = ADDRESS_COLS.map((c) => clean(r[c]).toUpperCase()).join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  });
  return [...groups.values()]
    .map((rs) => {
      const pick = (c) => mostCommon(rs.map((r) => clean(r[c])));
      const phone = pick("DODAAC_PHONE_NBR");
      return {
        dodaac: clean(rs[0].DODAAC_ID).toUpperCase(),
        name: pick("ORGN_NAME"),
        line1: pick("ORGN_ADDRESS_1"),
        line2: pick("ORGN_ADDRESS_2"),
        city: pick("ORGN_CITY"),
        state: pick("ORGN_STATE"),
        zip: pick("ORGN_ZIP"),
        country: pick("ORGN_COUNTRY"),
        apod: pick("APOD"),
        apoe: pick("APOE"),
        spod: pick("SPOD"),
        spoe: pick("SPOE"),
        icao: pick("ICAO"),
        phone: PLACEHOLDER_PHONE.test(phone) ? "" : phone,
        overseas: pick("OVERSEAS_IND") === "I",
        types: [...new Set(rs.map((r) => clean(r.ADDRESS_TYPE)))].sort(),
        records: rs.length,
      };
    })
    .sort((a, b) => b.records - a.records || a.name.localeCompare(b.name));
}

const SELECT = `SELECT ADDRESS_TYPE, DODAAC_ID, ${[...ADDRESS_COLS, ...EXTRA_COLS].join(", ")} FROM dodaacs`;

/**
 * Every distinct address recorded for one DoDAAC, most-used first.
 * Uses the idx_dodaac_id index (DODAAC_ID COLLATE NOCASE).
 */
export function lookupDodaac(db, code) {
  if (!isDodaac(code)) return [];
  return groupAddresses(all(db, `${SELECT} WHERE DODAAC_ID = ? COLLATE NOCASE AND ${VALID}`, [code.trim()]));
}

// A code shared by this many unrelated organisations is a placeholder (FB0000,
// FB1234 …), not a real activity.
export const PLACEHOLDER_NAMES = 5;
export const isPlaceholder = (addresses) => new Set(addresses.map((a) => a.name.toUpperCase())).size >= PLACEHOLDER_NAMES;

const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Search by code prefix, organization name, city or ZIP prefix. Returns one
 * entry per DoDAAC: the best-matching address, plus how many addresses the code
 * has in total. Code matches come first, then the most-used DoDAACs.
 */
export function searchDodaacs(db, text, limit = 25) {
  const q = clean(text);
  if (q.length < 2) return [];
  const params = { ":prefix": `${escapeLike(q)}%`, ":like": `%${escapeLike(q)}%` };
  const matches = all(
    db,
    `${SELECT}
      WHERE ${VALID}
        AND (DODAAC_ID LIKE :prefix ESCAPE '\\'
             OR ORGN_NAME LIKE :like ESCAPE '\\'
             OR ORGN_CITY LIKE :like ESCAPE '\\'
             OR ORGN_ZIP LIKE :prefix ESCAPE '\\')`,
    params
  );
  const byCode = new Map();
  matches.forEach((r) => {
    const code = clean(r.DODAAC_ID).toUpperCase();
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code).push(r);
  });
  const upper = q.toUpperCase();
  return [...byCode.entries()]
    .map(([code, rows]) => ({ ...groupAddresses(rows)[0], codeMatch: code.startsWith(upper) }))
    .sort((x, y) => y.codeMatch - x.codeMatch || (x.codeMatch ? x.dodaac.localeCompare(y.dodaac) : y.records - x.records))
    .slice(0, limit)
    .map((hit) => {
      const all = lookupDodaac(db, hit.dodaac);
      return { ...hit, addresses: all.length, placeholder: isPlaceholder(all) };
    });
}

/** Multi-line block for the shipper/consignee box: "FB4486  65 LRS ...\nLAJES FIELD ...". */
export function formatAddress(a) {
  const name = a.name.toUpperCase().startsWith(a.dodaac) ? a.name : `${a.dodaac} ${a.name}`.trim();
  const place = [a.city, [a.state, a.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [name, a.line1, a.line2, [place, a.country && a.country !== "US" ? a.country : ""].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join("\n");
}

// ---------- loading ----------

let dbPromise;

/**
 * Download the database and open it. Memoised, so the 6 MB file is fetched once
 * per visit and only when a lookup is first used. `initSqlJs` and `fetchImpl` can
 * be injected for tests.
 */
export function loadDodaacDb({ initSqlJs, fetchImpl = fetch } = {}) {
  if (!dbPromise) {
    dbPromise = (async () => {
      const init = initSqlJs || (await import("./sqljs")).default;
      const [SQL, buf] = await Promise.all([
        init(),
        fetchImpl(assetUrl(DB_PATH)).then((r) => {
          if (!r.ok) throw new Error(`Couldn't download the DoDAAC database (HTTP ${r.status}).`);
          return r.arrayBuffer();
        }),
      ]);
      return new SQL.Database(new Uint8Array(buf));
    })();
    dbPromise.catch(() => {
      dbPromise = undefined; // allow a retry
    });
  }
  return dbPromise;
}
