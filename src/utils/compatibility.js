// Load compatibility / segregation checks.
//
// AFMAN 24-604 (2025) Attachment 18: Table A18.1 + notes, Table A18.2 + notes, A18.4 (Chapter 3).
// 49 CFR: § 175.78 (aircraft) and § 177.848 (highway).
//
// checkLoad(entries, mode) -> { pairs, worst }
//   entries: [{ key, item, eq?, fissile? }]  (item = normalised table entry)
//   pairs:   [{ a, b, level, reasons: [{ text, cite }] }]
// Levels, most to least restrictive: X, O, cargo, sepmax, advisory, ok.

export const LEVELS = {
  X: { rank: 5, label: "Not permitted together", short: "X" },
  O: { rank: 4, label: "Separation required", short: "O" },
  cargo: { rank: 3, label: "Cargo aircraft only", short: "CAO" },
  sepmax: { rank: 2, label: "Separate to the maximum extent possible", short: "SEP" },
  advisory: { rank: 1, label: "Permitted — see note", short: "!" },
  ok: { rank: 0, label: "No restrictions", short: "✓" },
};

export const MODES = {
  afman2: { label: "AFMAN 24-604 — Chapter 2 (Tables A18.1 & A18.2)", regulation: "afman" },
  afman3: { label: "AFMAN 24-604 — Chapter 3 tactical/contingency (A18.4)", regulation: "afman" },
  cfrAir: { label: "49 CFR 175.78 — aircraft", regulation: "cfr" },
  cfrHighway: { label: "49 CFR 177.848 — highway", regulation: "cfr" },
};

// ---------- item helpers ----------

const division = (code) => {
  const m = (code || "").replace(/\s/g, "").replace(/l/g, "1").match(/^\d(\.\d)?/);
  return m ? m[0] : undefined;
};
const classNum = (code) => division(code)?.[0];
const compatGroup = (code) => (/^1\.\d([A-S])$/.exec((code || "").replace(/\s/g, "")) || [])[1];
const isLiquid = (item) => /\bLIQUIDS?\b|\bSOLUTIONS?\b/i.test(item.name) && !/\bSOLID\b/i.test(item.name);
const isSolid = (item) => /\bSOLID\b|\bPOWDER\b/i.test(item.name) && !isLiquid(item);
const zone = (item) => {
  for (const [code, z] of [["1", "A"], ["2", "B"], ["3", "C"], ["4", "D"]]) if (item.provisionCodes.includes(code)) return z;
  const m = /Hazard Zone ([A-D])/i.exec(item.name);
  return m ? m[1].toUpperCase() : undefined;
};
const isCyanide = (item) => division(item.hazardClass) === "6.1" && /CYANIDE/i.test(item.name);
const isAcid = (item) => classNum(item.hazardClass) === "8" && /ACID/i.test(item.name);
const LITHIUM = ["UN3480", "UN3090"];
const CHARGED_BATTERIES = ["UN2794", "UN2795", "UN2800", "UN3028"];
const AN_FERTILIZER = ["UN2067", "UN2071"];
const FIREWORKS = ["UN0333", "UN0334", "UN0335", "UN0336", "UN0337"];
const name = (e) => `${e.item.un || ""} ${e.item.name}`.trim();

const R = (text, cite) => ({ text, cite });
const res = (level, ...reasons) => ({ level, reasons });
const worse = (a, b) => (LEVELS[a].rank >= LEVELS[b].rank ? a : b);

/** Combine a table symbol from both directions (the printed tables aren't perfectly symmetric). */
const sym = (table, r, c) => {
  const a = table[r]?.[c] || "";
  const b = table[c]?.[r] || "";
  if (a === "X" || b === "X") return "X";
  if (a === "O" || b === "O") return "O";
  if (a === "*" || b === "*") return "*";
  return "";
};

/** Build {row: {col: symbol}} from rows of "col:SYM" tokens. */
const table = (rows) =>
  Object.fromEntries(
    Object.entries(rows).map(([r, s]) => [r, Object.fromEntries(s.split(" ").filter(Boolean).map((t) => t.split(":")))])
  );

// ---------- AFMAN Table A18.1 (transcribed from the 2025 edition) ----------

const ALL_EXPL = "1.1:* 1.3:* 1.4:* 1.5:* 1.6:*";
const A181 = table({
  "1.1": `${ALL_EXPL} 2.1:X 2.3A:X 2.3:X 3:X 4.1:X 4.2:X 4.3:X 5.1:X 5.2:X 6.1A:X 7:X 8L:X 9Li:O`,
  "1.3": `${ALL_EXPL} 2.1:X 2.3A:X 2.3:X 3:X 4.1:X 4.2:X 4.3:X 5.1:X 5.2:X 6.1A:X 7:O 8L:X 9Li:O`,
  "1.4": `${ALL_EXPL} 2.1:O 2.3A:O 2.3:O 3:O 4.2:O 6.1A:O 8L:O 9Li:O`,
  "1.5": `${ALL_EXPL} 2.1:X 2.2:X 2.3A:X 2.3:X 3:X 4.1:X 4.2:X 4.3:X 5.1:X 5.2:X 6.1A:X 7:X 8L:X 9Li:O`,
  "1.6": `${ALL_EXPL} 9Li:O`,
  "2.1": "1.1:X 1.3:X 1.4:O 1.5:X 2.3A:X 2.3:O 4.2:O 4.3:O 5.1:O 5.2:O 6.1A:O 7:O 8L:O 9Li:O",
  "2.2": "1.5:X",
  "2.3A": "1.1:X 1.3:X 1.4:O 1.5:X 2.1:X 3:X 4.1:X 4.2:X 4.3:X 5.1:X 5.2:X 8L:X",
  "2.3": "1.1:X 1.3:X 1.4:O 1.5:X 2.1:O 3:O 4.1:O 4.2:O 4.3:O 5.1:O 5.2:O 8L:O",
  "3": "1.1:X 1.3:X 1.4:O 1.5:X 2.3A:X 2.3:O 4.1:O 4.2:O 4.3:O 5.1:O 5.2:O 6.1A:X 9Li:O",
  "4.1": "1.1:X 1.3:X 1.5:X 2.3A:X 2.3:O 3:O 6.1A:X 8L:O 9Li:O",
  "4.2": "1.1:X 1.3:X 1.4:O 1.5:X 2.1:O 2.3A:X 2.3:O 3:O 6.1A:X 8L:X",
  "4.3": "1.1:X 1.3:X 1.5:X 2.1:O 2.3A:X 2.3:O 3:O 6.1A:X 8L:O",
  "5.1": "1.1:X 1.3:X 1.5:X 2.1:O 2.3A:X 2.3:O 3:O 6.1A:X 8L:O 9Li:O",
  "5.2": "1.1:X 1.3:X 1.5:X 2.1:O 2.3A:X 2.3:O 3:O 6.1A:X 8L:O",
  "6.1A": "1.1:X 1.3:X 1.4:O 1.5:X 2.1:O 3:X 4.1:X 4.2:X 4.3:X 5.1:X 5.2:X 8L:X",
  "7": "1.1:X 1.3:O 1.5:X 2.1:O",
  "8L": "1.1:X 1.3:X 1.4:O 1.5:X 2.1:O 2.3A:X 2.3:O 4.1:O 4.2:X 4.3:O 5.1:O 5.2:O 6.1A:X",
  "9Li": "1.1:O 1.3:O 1.4:O 1.5:O 1.6:O 2.1:O 3:O 4.1:O 5.1:O",
});

// Table A18.2: compatibility groups that may NOT be loaded together.
const A182_X = {
  A: "BCDEFGHJKLNS",
  B: "ACDEFGHJKLN",
  C: "ABFGHJKL",
  D: "ABFGHJKL",
  E: "ABFGHJKL",
  F: "ABCDEGHJKLN",
  G: "ABCDEFHJKLN",
  H: "ABCDEFGJKLN",
  J: "ABCDEFGHKLN",
  K: "ABCDEFGHJLN",
  L: "ABCDEFGHJKNS",
  N: "ABFGHJKL",
  S: "AL",
};
const a182Incompatible = (g1, g2) => A182_X[g1]?.includes(g2) || A182_X[g2]?.includes(g1);

/** AFMAN Table A18.1 row/column for an entry, or a reason it has no restrictions (A18.2.1: primary hazard only). */
function afmanCategory(e) {
  const { item } = e;
  const div = division(item.hazardClass);
  const cls = classNum(item.hazardClass);
  if (e.eq) return { free: "Excepted quantities may be shipped with all other hazardous materials (Note 7.4)." };
  if (item.un === "UN3528") return { free: "Segregation is not required between UN3528 and other hazardous materials (Note 12)." };
  if (!div) return { free: "No hazard class is assigned." };
  if (cls === "1") return { cat: div === "1.2" ? "1.1" : div };
  if (div === "2.3") return { cat: zone(item) === "A" ? "2.3A" : "2.3" };
  if (div === "6.1") {
    if (item.pg === "I" && zone(item) === "A" && !isSolid(item)) return { cat: "6.1A" };
    return { free: "Class 6.1 other than liquids PG I, Zone A has no compatibility restrictions (Note 7.1)." };
  }
  if (cls === "8") {
    if (isSolid(item)) return { free: "Class 8 solids have no compatibility restrictions (Note 7.2)." };
    return { cat: "8L", assumedLiquid: !isLiquid(item) };
  }
  if (cls === "9") {
    if (LITHIUM.includes(item.un)) return { cat: "9Li" };
    return { free: "Class 9 has no compatibility restrictions (Note 7.3), except UN3480/UN3090." };
  }
  if (["2.1", "2.2", "3", "4.1", "4.2", "4.3", "5.1", "5.2", "7"].includes(div)) return { cat: div };
  return { free: `Class ${div} is not in Table A18.1, so no restrictions apply (A18.2.2).` };
}

const CITE_A181 = "AFMAN 24-604, Table A18.1";
const CITE_A182 = "AFMAN 24-604, Table A18.2";

function afmanExplosivesPair(a, b) {
  const ia = a.item;
  const ib = b.item;
  const ga = compatGroup(ia.hazardClass);
  const gb = compatGroup(ib.hazardClass);
  if (!ga || !gb) return res("advisory", R("Compatibility group not shown in the table entry — check Table A18.2 manually.", CITE_A182));
  const big = (i) => ["1.1", "1.2"].includes(division(i.hazardClass));
  if ((big(ia) && FIREWORKS.includes(ib.un)) || (big(ib) && FIREWORKS.includes(ia.un)))
    return res("X", R("Class 1.1 and 1.2 explosives may not be shipped with fireworks UN0333–UN0337 (Note 7).", CITE_A182));
  if (ga === "L" || gb === "L") {
    if (ia.un && ia.un === ib.un) return res("ok", R("Group L may be loaded with an identical item (Note 6).", CITE_A182));
    return res("X", R("Group L explosives may only be loaded and transported with an identical item (Note 6).", CITE_A182));
  }
  if (!a182Incompatible(ga, gb)) return res("ok", R(`Compatibility groups ${ga} and ${gb} may be loaded together.`, CITE_A182));

  // Cargo-aircraft-only relaxations (Notes 1, 3, 4, 5, 8)
  const pairIs = (i, j, cond) => cond(i, j) || cond(j, i);
  const CDE = (g) => "CDE".includes(g);
  const g = (i) => compatGroup(i.hazardClass);
  const notes = [
    [(i, j) => ["UN0255", "UN0257", "UN0267", "UN0361"].includes(i.un) && CDE(g(j)), "Group B UN0255/0257/0267/0361 may be loaded with groups C, D and E on cargo aircraft only (Note 1)."],
    [(i, j) => i.un === "UN0292" && CDE(g(j)), "Group F UN0292 may be loaded with groups C, D and E on cargo aircraft only (Note 3)."],
    [(i, j) => ["UN0019", "UN0300", "UN0301", "UN0325"].includes(i.un) && !a182Incompatible("S", g(j)), "Group G UN0019/0300/0301/0325 may be loaded with explosives compatible with group S on cargo aircraft only (Note 4)."],
    [(i, j) => ["UN0009", "UN0018", "UN0314", "UN0315", "UN0317", "UN0319", "UN0320"].includes(i.un) && CDE(g(j)), "This group G item may be transported with groups C, D and E on cargo aircraft only (Note 5)."],
    [(i, j) => division(i.hazardClass) === "1.4" && division(j.hazardClass) === "1.4" && "BG".includes(g(i)) && "BCDEG".includes(g(j)), "Class 1.4 groups B and G may be loaded together or with 1.4 groups C, D and E on cargo aircraft only (Note 8)."],
  ];
  for (const [cond, text] of notes) if (pairIs(ia, ib, cond)) return res("cargo", R(text, CITE_A182));
  const extra = ga === "B" || gb === "B" ? [R("Group B packed in an EOD MK 663, MOD 0 container may be loaded with groups C–H and S (Note 2).", CITE_A182)] : [];
  return res("X", R(`Compatibility groups ${ga} and ${gb} may not be loaded or stored together (A18.3.2).`, CITE_A182), ...extra);
}

function afmanChapter2(a, b) {
  const ia = a.item;
  const ib = b.item;
  const either = (f) => f(a, b) || f(b, a);

  if (a.fissile || b.fissile)
    return res("X", R("Fissile Class III radioactive material may not be on the same aircraft as any other hazardous material (Note 2).", CITE_A181));
  if (either((x, y) => isCyanide(x.item) && classNum(y.item.hazardClass) === "8"))
    return res("X", R("Cyanides or cyanide mixtures (6.1) may not be loaded with any Class 8 material (Note 4).", CITE_A181));
  if (either((x, y) => CHARGED_BATTERIES.includes(x.item.un) && ["1.1", "1.2"].includes(division(y.item.hazardClass))))
    return res("X", R("Charged electric storage batteries (Class 8) may not be on the same aircraft as Class 1.1 or 1.2 (Note 6).", CITE_A181));

  const ca = afmanCategory(a);
  const cb = afmanCategory(b);
  if (ca.free) return res("ok", R(ca.free, CITE_A181));
  if (cb.free) return res("ok", R(cb.free, CITE_A181));

  if (classNum(ia.hazardClass) === "1" && classNum(ib.hazardClass) === "1") return afmanExplosivesPair(a, b);

  let s = sym(A181, ca.cat, cb.cat);
  const reasons = [];
  // Overrides
  if (s === "X" && either((x, y) => AN_FERTILIZER.includes(x.item.un) && ["1.1", "1.5"].includes(division(y.item.hazardClass))))
    return res("ok", R("Ammonium nitrate fertilizer may be loaded with Class 1.1 or 1.5 (Note 1).", CITE_A181));
  if (s && either((x, y) => x.item.un === "UN2909" && ["1.1", "1.2", "1.5"].includes(division(y.item.hazardClass))))
    return res("ok", R("Natural/depleted uranium and thorium metal articles may be loaded with Class 1.1, 1.2 and 1.5 (Note 3).", CITE_A181));
  if (s && either((x, y) => LITHIUM.includes(x.item.un) && y.item.hazardClass.replace(/\s/g, "") === "1.4S"))
    return res("ok", R("Lithium batteries need not be segregated from Division 1.4S (Note 11).", CITE_A181));
  if (s === "X" && either((x) => x.item.un === "UN1950" && division(x.item.hazardClass) === "2.1")) {
    s = "O";
    reasons.push(R("Class 2.1 aerosols may be shipped with incompatible items when separated in all directions by at least 88 inches (Note 9).", CITE_A181));
  }

  let level = "ok";
  if (s === "X") {
    level = "X";
    reasons.unshift(R(`Class ${ca.cat.replace("A", " Zone A").replace("Li", " (UN3480/UN3090)").replace("L", " liquid")} and ${cb.cat.replace("A", " Zone A").replace("Li", " (UN3480/UN3090)").replace("L", " liquid")} may not be loaded, transported or stored together (A18.2.3).`, CITE_A181));
  } else if (s === "O") {
    level = "O";
    reasons.unshift(R("May not be loaded together unless separated by a 463L pallet position or at least 2.2 m (88 inches) in all directions (A18.2.4).", CITE_A181));
  } else {
    reasons.unshift(R("No restrictions in Table A18.1.", CITE_A181));
  }

  // Advisories
  if (either((x, y) => afmanCategory(x).cat === "8L" && ["4", "5"].includes(classNum(y.item.hazardClass)))) {
    level = worse(level, "advisory");
    reasons.push(R("Class 8 corrosive liquids may not be loaded above or adjacent to Class 4 or Class 5 material (Note 8).", CITE_A181));
  }
  if (either((x, y) => ["UN2031", "UN2032"].includes(x.item.un) && afmanCategory(y).cat === "8L")) {
    level = worse(level, "advisory");
    reasons.push(R("Nitric acid in carboys must be separated by 2.2 m (88 inches) from other corrosives in carboys (Note 5).", CITE_A181));
  }
  if (ca.assumedLiquid || cb.assumedLiquid) reasons.push(R("Treated as a Class 8 liquid; if it's a solid, no restrictions apply (Note 7.2).", CITE_A181));
  return res(level, ...reasons);
}

// ---------- AFMAN Chapter 3 (A18.4) ----------

const CITE_A184 = "AFMAN 24-604, A18.4";

function afmanChapter3(a, b) {
  const either = (f) => f(a, b) || f(b, a);
  const g = (e) => compatGroup(e.item.hazardClass);
  const div = (e) => division(e.item.hazardClass);
  const isExpl = (e) => classNum(e.item.hazardClass) === "1";
  const big3 = (e) => ["1.1", "1.2", "1.3"].includes(div(e));

  if (a.fissile || b.fissile)
    return res("X", R("Fissile Class III radioactive material cannot be on the same aircraft as any other hazardous material (A18.4.2).", CITE_A184));
  if (either((x, y) => isExpl(x) && "AJKL".includes(g(x) || "-") && !(isExpl(y) && g(y) === "S") && classNum(y.item.hazardClass) !== "9" && x.item.un !== y.item.un))
    return res("X", R("Explosives in compatibility groups A, J, K and L can only be shipped with group S and Class 9 (A18.4.1).", CITE_A184));
  if (either((x, y) => big3(x) && zone(y.item) === "A"))
    return res("X", R("Class 1.1, 1.2 and 1.3 cannot be shipped with any Inhalation Hazard Zone A material (A18.4.3).", CITE_A184));
  if (either((x, y) => big3(x) && div(y) === "6.1" && y.item.pg === "I" && !isSolid(y.item)))
    return res("X", R("Class 1.1, 1.2 and 1.3 cannot be shipped with Class 6.1 poisonous liquids, PG I (A18.4.4).", CITE_A184));
  if (either((x, y) => isCyanide(x.item) && classNum(y.item.hazardClass) === "8"))
    return res("X", R("Cyanides or cyanide mixtures (6.1) cannot be loaded with any Class 8 material (A18.4.5).", CITE_A184));

  const normal = afmanChapter2(a, b);
  if (["X", "O", "cargo"].includes(normal.level))
    return res("sepmax", R("Normally restricted, but under Chapter 3 may be transported on the same aircraft when separated to the maximum extent possible; no compatibility waiver required (A18.4).", CITE_A184), ...normal.reasons.map((r) => R(`Chapter 2 rule: ${r.text}`, r.cite)));
  return res("ok", R("No Chapter 3 restriction applies.", CITE_A184));
}

// ---------- 49 CFR 175.78 (aircraft) ----------

const CITE_175 = "49 CFR 175.78";
const T175_X = {
  "2.1": ["9Li"],
  "3": ["5.1", "9Li"],
  "4.1": ["9Li"],
  "4.2": ["5.1"],
  "4.3": ["8"],
  "5.1": ["3", "4.2", "9Li"],
  "8": ["4.3"],
  "9Li": ["2.1", "3", "4.1", "5.1"],
};
const t175 = (r, c) => T175_X[r]?.includes(c) || T175_X[c]?.includes(r);

/** Hazard labels on the package (primary and subsidiary), mapped to Segregation Table rows. */
function airLabels(item) {
  const labels = item.labels?.length ? item.labels : [item.hazardClass, ...(item.subsidiaryHazards || [])];
  return labels
    .map((l) => {
      const d = division(l);
      if (!d) return null;
      if (d[0] === "1") return { key: "1", code: l.replace(/\s/g, "") };
      if (d === "2.2" || d === "2.3") return { key: "2.2" };
      if (d[0] === "9") return LITHIUM.includes(item.un) ? { key: "9Li" } : null;
      return ["2.1", "3", "4.1", "4.2", "4.3", "5.1", "5.2", "8"].includes(d) ? { key: d } : null;
    })
    .filter(Boolean);
}

function cfrAir(a, b) {
  const ia = a.item;
  const ib = b.item;
  if (ia.un && ia.un === ib.un) return res("ok", R("Packages bearing the same UN number need not be segregated (§ 175.78(c)(6)).", CITE_175));
  const la = airLabels(ia);
  const lb = airLabels(ib);
  if (!la.length || !lb.length) return res("ok", R("Hazard labels not shown in the Segregation Table are not subject to segregation (§ 175.78(c)(1)).", CITE_175));

  let level = "ok";
  const reasons = [];
  const add = (l, r) => {
    level = worse(level, l);
    if (!reasons.some((x) => x.text === r.text)) reasons.push(r);
  };
  for (const x of la) {
    for (const y of lb) {
      if (x.key === "1" && y.key === "1") {
        const s = (c) => c.endsWith("S") && c.startsWith("1.4");
        const b4 = (c) => c === "1.4B";
        if ((b4(x.code) && !s(y.code)) || (b4(y.code) && !s(x.code))) {
          const with13 = x.code.startsWith("1.3") || y.code.startsWith("1.3");
          add("O", R(`Division 1.4B must not be stowed with ${with13 ? "Division 1.3" : "other"} explosives except 1.4S: load in separate unit load devices separated by at least 2 m (6.5 ft) of other cargo (§ 175.78(c)(4)(iii)–(iv)).`, CITE_175));
        } else {
          add("ok", R("Explosives of different compatibility groups may be stowed together aboard aircraft, except 1.4B (Note 1, § 175.78(c)(4)).", CITE_175));
        }
      } else if (x.key === "1" || y.key === "1") {
        const expl = x.key === "1" ? x : y;
        if (expl.code === "1.4S") add("ok", R("Division 1.4S may be stowed with other classes (Note 2).", CITE_175));
        else add("X", R("Explosives other than Division 1.4S may not be stowed together with other classes (Note 2, § 175.78(c)(5)).", CITE_175));
      } else if (t175(x.key, y.key)) {
        if ((ia.un === "UN3528" || ib.un === "UN3528") && [x.key, y.key].includes("5.1") && [x.key, y.key].includes("3")) {
          add("ok", R("UN3528 engines/machinery need not be segregated from Division 5.1 (Note 3).", CITE_175));
        } else {
          const lbl = (k) => (k === "9Li" ? "Class 9 (UN3090/UN3480)" : `${k}`);
          add("X", R(`Packages labeled ${lbl(x.key)} and ${lbl(y.key)} may not be stowed next to or in contact with each other, or where they could interact if leaking (§ 175.78(c)(3)).`, CITE_175));
        }
      }
    }
  }
  const torp = ["UN0192", "UN0193", "UN0492", "UN0493", ...FIREWORKS];
  if ((division(ia.hazardClass) === "1.5" && torp.includes(ib.un)) || (division(ib.hazardClass) === "1.5" && torp.includes(ia.un)))
    add("X", R("Packages labeled BLASTING AGENT may not be stowed next to special fireworks or railway torpedoes (§ 175.78(c)(7)).", CITE_175));
  if (!reasons.length) reasons.push(R("No restrictions in the Segregation Table.", CITE_175));
  return res(level, ...reasons);
}

// ---------- 49 CFR 177.848 (highway) ----------

const CITE_177 = "49 CFR 177.848";
const T177 = table({
  "1.1": `${ALL_EXPL} 2.1:X 2.2:X 2.3A:X 2.3B:X 3:X 4.1:X 4.2:X 4.3:X 5.1:X 5.2:X 6.1A:X 7:X 8L:X`,
  "1.3": `${ALL_EXPL} 2.1:X 2.3A:X 2.3B:X 3:X 4.2:X 4.3:X 5.1:X 5.2:X 6.1A:X 8L:X`,
  "1.4": `${ALL_EXPL} 2.1:O 2.3A:O 2.3B:O 3:O 4.2:O 6.1A:O 8L:O`,
  "1.5": `${ALL_EXPL} 2.1:X 2.2:X 2.3A:X 2.3B:X 3:X 4.1:X 4.2:X 4.3:X 5.1:X 5.2:X 6.1A:X 7:X 8L:X`,
  "1.6": ALL_EXPL,
  "2.1": "1.1:X 1.3:X 1.4:O 1.5:X 2.3A:X 2.3B:O 6.1A:O 7:O",
  "2.2": "1.1:X 1.5:X",
  "2.3A": "1.1:X 1.3:X 1.4:O 1.5:X 2.1:X 3:X 4.1:X 4.2:X 4.3:X 5.1:X 5.2:X 8L:X",
  "2.3B": "1.1:X 1.3:X 1.4:O 1.5:X 2.1:O 3:O 4.1:O 4.2:O 4.3:O 5.1:O 5.2:O 8L:O",
  "3": "1.1:X 1.3:X 1.4:O 1.5:X 2.3A:X 2.3B:O 5.1:O 6.1A:X",
  "4.1": "1.1:X 1.5:X 2.3A:X 2.3B:O 6.1A:X 8L:O",
  "4.2": "1.1:X 1.3:X 1.4:O 1.5:X 2.3A:X 2.3B:O 6.1A:X 8L:X",
  "4.3": "1.1:X 1.3:X 1.5:X 2.3A:X 2.3B:O 6.1A:X 8L:O",
  "5.1": "1.1:X 1.3:X 1.5:X 2.3A:X 2.3B:O 3:O 6.1A:X 8L:O",
  "5.2": "1.1:X 1.3:X 1.5:X 2.3A:X 2.3B:O 6.1A:X 8L:O",
  "6.1A": "1.1:X 1.3:X 1.4:O 1.5:X 2.1:O 3:X 4.1:X 4.2:X 4.3:X 5.1:X 5.2:X 8L:X",
  "7": "1.1:X 1.5:X 2.1:O",
  "8L": "1.1:X 1.3:X 1.4:O 1.5:X 2.3A:X 2.3B:O 4.1:O 4.2:X 4.3:O 5.1:O 5.2:O 6.1A:X",
});

// § 177.848(f) Class 1 compatibility table (codes: X, 1–6, "4/5")
const G = "ABCDEFGHJKLNS".split("");
const F177 = Object.fromEntries(
  Object.entries({
    A: "- X X X X X X X X X X X X",
    B: "X - X X4 X X X X X X X X 4/5",
    C: "X X - 2 2 X 6 X X X X 3 4/5",
    D: "X X4 2 - 2 X 6 X X X X 3 4/5",
    E: "X X 2 2 - X 6 X X X X 3 4/5",
    F: "X X X X X - X X X X X X 4/5",
    G: "X X 6 6 6 X - X X X X X 4/5",
    H: "X X X X X X X - X X X X 4/5",
    J: "X X X X X X X X - X X X 4/5",
    K: "X X X X X X X X X - X X 4/5",
    L: "X X X X X X X X X X 1 X X",
    N: "X X 3 3 3 X X X X X X - 4/5",
    S: "X 4/5 4/5 4/5 4/5 4/5 4/5 4/5 4/5 4/5 X 4/5 -",
  }).map(([r, s]) => [r, Object.fromEntries(s.split(" ").map((v, i) => [G[i], v]))])
);

function highwayCategories(item) {
  const cats = [];
  const hazards = [item.hazardClass, ...(item.subsidiaryHazards || [])];
  hazards.forEach((h, i) => {
    const d = division(h);
    if (!d) return;
    if (d[0] === "1") cats.push(d === "1.2" ? "1.1" : d);
    else if (d === "2.3") {
      const z = zone(item);
      if (z === "A") cats.push("2.3A");
      else if (z === "B" || !z) cats.push("2.3B");
    } else if (d === "6.1") {
      if (i === 0 && item.pg === "I" && zone(item) === "A" && !isSolid(item)) cats.push("6.1A");
    } else if (d[0] === "8") {
      if (!isSolid(item)) cats.push("8L");
    } else if (["2.1", "2.2", "3", "4.1", "4.2", "4.3", "5.1", "5.2", "7"].includes(d)) cats.push(d);
  });
  return [...new Set(cats)];
}

function cfrHighway(a, b) {
  const ia = a.item;
  const ib = b.item;
  const either = (f) => f(ia, ib) || f(ib, ia);
  let level = "ok";
  const reasons = [];
  const add = (l, r) => {
    level = worse(level, l);
    if (!reasons.some((x) => x.text === r.text)) reasons.push(r);
  };

  if (either((x, y) => isCyanide(x) && isAcid(y)))
    add("X", R("Cyanides may not be loaded with acids if a mixture would generate hydrogen cyanide (§ 177.848(c)).", CITE_177));
  if (either((x, y) => division(x.hazardClass) === "4.2" && classNum(y.hazardClass) === "8" && !isSolid(y)))
    add("X", R("Division 4.2 may not be loaded with Class 8 liquids (§ 177.848(c)).", CITE_177));

  if (classNum(ia.hazardClass) === "1" && classNum(ib.hazardClass) === "1") {
    const ga = compatGroup(ia.hazardClass);
    const gb = compatGroup(ib.hazardClass);
    if (!ga || !gb) return res("advisory", R("Compatibility group not shown — check § 177.848(f).", CITE_177));
    const v = ga === gb && ga !== "L" ? "" : F177[ga][gb];
    const texts = {
      X: ["X", "Explosives of these compatibility groups may not be carried on the same transport vehicle (§ 177.848(g)(2))."],
      X4: ["X", "Not permitted together; see § 177.835(g) when transporting detonators."],
      "1": ia.un === ib.un ? ["ok", "Group L may be carried with an identical explosive (note 1)."] : ["X", "Group L may only be carried with an identical explosive (note 1)."],
      "2": ["advisory", "Permitted: any combination of groups C, D and E is assigned to group E (note 2)."],
      "3": ["advisory", "Permitted: a combination of C, D or E with N is assigned to group D (note 3)."],
      "6": ["advisory", "Permitted for group G articles (not fireworks or special-handling items) with C, D and E, if no explosive substances are on the same vehicle (note 6)."],
      "4/5": either((x, y) => x.un === "UN0337" && ["1.1", "1.2"].includes(division(y.hazardClass)))
        ? ["X", "Division 1.4S fireworks may not be loaded with Division 1.1 or 1.2 (note 5)."]
        : ["advisory", "Permitted; see § 177.835(g) when transporting detonators (note 4)."],
    };
    const [l, t] = texts[v] || ["ok", "Same compatibility group — permitted; the load is treated as the lowest division (§ 177.848(h))."];
    add(l, R(t, CITE_177));
    return res(level, ...reasons);
  }

  const ca = highwayCategories(ia);
  const cb = highwayCategories(ib);
  const sameClass = classNum(ia.hazardClass) === classNum(ib.hazardClass);
  for (const x of sameClass ? ca.slice(0, 1) : ca) {
    for (const y of sameClass ? cb.slice(0, 1) : cb) {
      let s = sym(T177, x, y);
      if (s === "*") continue;
      if (s === "X" && either((p, q) => ["UN1942", ...AN_FERTILIZER].includes(p.un) && ["1.1", "1.5"].includes(division(q.hazardClass)))) {
        add("ok", R("Ammonium nitrate and ammonium nitrate fertilizer may be loaded with Division 1.1 or 1.5 (note A).", CITE_177));
        continue;
      }
      if (s === "X") add("X", R(`Class ${x} and ${y} may not be loaded, transported or stored together in the same vehicle (§ 177.848(e)(2)).`, CITE_177));
      if (s === "O") add("O", R("Not permitted together unless separated so that leaking packages could not commingle (§ 177.848(e)(3)).", CITE_177));
    }
  }
  if (either((x, y) => classNum(x.hazardClass) === "8" && !isSolid(x) && ["4", "5"].includes(classNum(y.hazardClass)))) {
    add("advisory", R("Class 8 liquids may not be loaded above or adjacent to Class 4 or Class 5 materials (§ 177.848(e)(3)).", CITE_177));
  }
  if (!sameClass && ((ia.subsidiaryHazards || []).length || (ib.subsidiaryHazards || []).length))
    reasons.push(R("Subsidiary hazards were applied where more restrictive (§ 177.848(e)(6)).", CITE_177));
  if (!reasons.length) reasons.push(R("No restrictions in the segregation table.", CITE_177));
  return res(level, ...reasons);
}

// ---------- public API ----------

const PAIR_FN = { afman2: afmanChapter2, afman3: afmanChapter3, cfrAir, cfrHighway };

export function checkPair(a, b, mode) {
  return PAIR_FN[mode](a, b);
}

export function checkLoad(entries, mode) {
  const pairs = [];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      pairs.push({ a: entries[i], b: entries[j], ...checkPair(entries[i], entries[j], mode) });
    }
  }
  const worst = pairs.reduce((w, p) => worse(w, p.level), "ok");
  return { pairs, worst };
}

export const describe = name;
