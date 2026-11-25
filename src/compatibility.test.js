import afman from "./regulations/afman";
import cfr from "./regulations/cfr";
import { checkLoad, checkPair } from "./utils/compatibility";

let A;
let C;
beforeAll(async () => {
  A = await afman.load();
  C = await cfr.load();
});

const pick = (data, un, pg, nameIncludes) => {
  const item = data.items.find(
    (i) => i.un === un && i.hazardClass && (pg === undefined || i.pg === pg) && (!nameIncludes || i.name.toUpperCase().includes(nameIncludes))
  );
  if (!item) throw new Error(`no ${un}`);
  return { key: item.id, item };
};
const lvl = (a, b, mode) => checkPair(a, b, mode).level;

describe("AFMAN Chapter 2", () => {
  test("Class 3 and 5.1 need separation (O)", () => {
    expect(lvl(pick(A, "UN1090"), pick(A, "UN1479", "II"), "afman2")).toBe("O");
  });
  test("Class 1.1 and Class 3 are X", () => {
    const tnt = { key: 1, item: A.items.find((i) => /^1\.1D/.test(i.hazardClass)) };
    expect(lvl(tnt, pick(A, "UN1090"), "afman2")).toBe("X");
  });
  test("Class 9 other than lithium batteries is unrestricted (Note 7.3)", () => {
    const tnt = { key: 1, item: A.items.find((i) => /^1\.1D/.test(i.hazardClass)) };
    expect(lvl(tnt, pick(A, "UN3082", "III"), "afman2")).toBe("ok");
  });
  test("Lithium ion batteries vs Class 3 need separation (O)", () => {
    expect(lvl(pick(A, "UN3480"), pick(A, "UN1090"), "afman2")).toBe("O");
  });
  test("Excepted quantities ship with anything (Note 7.4)", () => {
    const tnt = { key: 1, item: A.items.find((i) => /^1\.1D/.test(i.hazardClass)) };
    expect(lvl(tnt, { ...pick(A, "UN1090"), eq: true }, "afman2")).toBe("ok");
  });
  test("Cyanide vs Class 8 is X (Note 4)", () => {
    expect(lvl(pick(A, "UN1689"), pick(A, "UN1824", "II"), "afman2")).toBe("X");
  });
  test("Explosive compatibility groups use Table A18.2", () => {
    const g = (c) => ({ key: c, item: A.items.find((i) => i.hazardClass.replace(/\s/g, "") === c) });
    expect(lvl(g("1.1D"), g("1.1E"), "afman2")).toBe("ok");
    expect(lvl(g("1.1D"), g("1.1G"), "afman2")).toBe("X");
    expect(lvl(g("1.4S"), g("1.1D"), "afman2")).toBe("ok");
  });
});

describe("AFMAN Chapter 3 (A18.4)", () => {
  test("Normally incompatible pairs become 'separate to the maximum extent possible'", () => {
    const tnt = { key: 1, item: A.items.find((i) => /^1\.1D/.test(i.hazardClass)) };
    expect(lvl(tnt, pick(A, "UN1090"), "afman3")).toBe("sepmax");
  });
  test("Cyanide vs Class 8 remains prohibited", () => {
    expect(lvl(pick(A, "UN1689"), pick(A, "UN1824", "II"), "afman3")).toBe("X");
  });
  test("1.1/1.2/1.3 not with 6.1 PG I liquids", () => {
    const tnt = { key: 1, item: A.items.find((i) => /^1\.1D/.test(i.hazardClass)) };
    const poison = { key: 2, item: A.items.find((i) => i.hazardClass === "6.1" && i.pg === "I" && /LIQUID/.test(i.name)) };
    expect(lvl(tnt, poison, "afman3")).toBe("X");
  });
  test("Fissile Class III goes with nothing", () => {
    const rad = { key: 3, item: A.items.find((i) => i.hazardClass === "7"), fissile: true };
    expect(lvl(rad, pick(A, "UN3082", "III"), "afman3")).toBe("X");
  });
});

describe("49 CFR", () => {
  test("175.78: Class 3 and 5.1 may not be stowed together", () => {
    expect(lvl(pick(C, "UN1090"), pick(C, "UN1479", "II"), "cfrAir")).toBe("X");
  });
  test("175.78: subsidiary labels count (4.3 with 8 label)", () => {
    const corr = pick(C, "UN1824", "II");
    const wr = { key: 9, item: C.items.find((i) => i.hazardClass === "4.3" && i.labels.length === 1) };
    expect(lvl(wr, corr, "cfrAir")).toBe("X");
  });
  test("175.78: same UN number needs no segregation", () => {
    expect(lvl(pick(C, "UN1090"), pick(C, "UN1090"), "cfrAir")).toBe("ok");
  });
  test("177.848: Class 3 and 5.1 need separation (O); 1.1 vs 3 is X", () => {
    expect(lvl(pick(C, "UN1090"), pick(C, "UN1479", "II"), "cfrHighway")).toBe("O");
    const tnt = { key: 1, item: C.items.find((i) => /^1\.1D/.test(i.hazardClass)) };
    expect(lvl(tnt, pick(C, "UN1090"), "cfrHighway")).toBe("X");
  });
});

test("every pair of a random sample evaluates without throwing in every mode", () => {
  const sample = (data) => data.items.filter((i) => i.hazardClass).filter((_, n) => n % 37 === 0).map((item) => ({ key: item.id, item }));
  const a = sample(A);
  const c = sample(C);
  for (const m of ["afman2", "afman3"]) expect(checkLoad(a, m).pairs.length).toBe((a.length * (a.length - 1)) / 2);
  for (const m of ["cfrAir", "cfrHighway"]) expect(checkLoad(c, m).pairs.length).toBe((c.length * (c.length - 1)) / 2);
});
