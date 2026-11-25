import afman from "./regulations/afman";
import cfr from "./regulations/cfr";

let A;
let C;
beforeAll(async () => {
  A = await afman.load();
  C = await cfr.load();
});

const find = (data, un, pg = undefined, name = undefined) =>
  data.items.find((i) => i.un === un && (pg === undefined || i.pg === pg) && (!name || i.name.toUpperCase().includes(name)));

describe("AFMAN Attachment 19", () => {
  test("Acetone (Class 3, PG II): EQ 30 mL / 500 mL, LQ 500 mL / 1 L", () => {
    const [eq, lq] = afman.quantityCards(find(A, "UN1090"));
    expect(eq.status).toBe("permitted");
    expect(eq.rows[0]).toMatchObject({ inner: "30 mL", outer: "500 mL" });
    expect(lq.rows[0]).toMatchObject({ inner: "500 mL", outer: "1 L" });
  });

  test("Acetaldehyde (P3, cargo aircraft only) is excluded from both", () => {
    const [eq, lq] = afman.quantityCards(find(A, "UN1089"));
    expect(eq.status).toBe("not-permitted");
    expect(lq.status).toBe("not-permitted");
  });

  test("Aerosols: no EQ, but LQ permitted", () => {
    const [eq, lq] = afman.quantityCards(find(A, "UN1950", "", "AEROSOLS OR AEROSOLS, FLAMMABLE"));
    expect(eq.status).toBe("not-permitted");
    expect(lq.status).toBe("permitted");
  });

  test("6.1 PG I (not inhalation): EQ inner 1 g or 1 mL, outer 300; no LQ", () => {
    const [eq, lq] = afman.quantityCards(find(A, "UN1557", "I"));
    expect(eq.status).toBe("permitted");
    expect(eq.rows[0]).toMatchObject({ inner: "1 g or 1 mL", outer: "300 g or 300 mL" });
    expect(lq.status).toBe("not-permitted");
  });

  test("Class 8 liquid PG II uses the most restrictive limits and the liquid LQ row", () => {
    const [eq, lq] = afman.quantityCards(find(A, "UN1824", "II"));
    expect(eq.rows[0].outer).toBe("500 g or 500 mL");
    expect(lq.rows).toEqual([{ label: "Liquid", inner: "100 mL", outer: "500 mL" }]);
  });

  test("Wet batteries are excluded (note 4 / A19.3.1.9)", () => {
    const [eq, lq] = afman.quantityCards(find(A, "UN2794"));
    expect(eq.status).toBe("not-permitted");
    expect(lq.status).toBe("not-permitted");
  });

  test("Class 9 UN3082 PG III", () => {
    const [eq, lq] = afman.quantityCards(find(A, "UN3082", "III", "ENVIRONMENTALLY"));
    expect(eq.rows[0].outer).toBe("1 kg or 1 L");
    expect(lq.rows[0]).toMatchObject({ inner: "5 L", outer: "30 kg gross" });
  });
});

describe("49 CFR", () => {
  test("Acetone: EQ, ground LQ (§173.150) and air LQ (Table 3)", () => {
    const [eq, ground, air] = cfr.quantityCards(find(C, "UN1090"));
    expect(eq.rows[0]).toMatchObject({ inner: "30 g or 30 mL", outer: "500 g or 500 mL" });
    expect(ground.cite).toBe("49 CFR 173.150");
    expect(ground.rows[0].inner).toBe("1 L");
    expect(air.rows[0]).toMatchObject({ inner: "0.5 L", outer: "1 L" });
  });

  test("Sodium hydroxide solution PG II", () => {
    const [, ground, air] = cfr.quantityCards(find(C, "UN1824", "II"));
    expect(ground.rows).toEqual([{ label: "Liquid", inner: "1 L", outer: "30 kg gross" }]);
    expect(air.rows).toEqual([{ label: "Liquid", inner: "0.1 L", outer: "0.5 L" }]);
  });

  test("Flammable liquid with corrosive subsidiary risk gets the footnote limit by air", () => {
    const item = C.items.find((i) => i.un === "UN2924" && i.pg === "II");
    const [, , air] = cfr.quantityCards(item);
    expect(air.rows[0].outer).toBe("0.5 L");
  });

  test("Hazard Zone A/B poisons are excluded from EQ", () => {
    const item = C.items.find((i) => i.hazardClass === "6.1" && i.pg === "I" && i.provisionCodes.includes("2") && i.raw.qtyPassenger !== "Forbidden");
    if (item) expect(cfr.quantityCards(item)[0].status).toBe("not-permitted");
  });

  test("Materials forbidden on passenger aircraft can't use EQ or air LQ", () => {
    const item = C.items.find((i) => i.raw.qtyPassenger === "Forbidden" && i.raw.qtyCargo && i.raw.qtyCargo !== "Forbidden");
    const [eq, , air] = cfr.quantityCards(item);
    expect(eq.status).toBe("not-permitted");
    expect(air.status).toBe("not-permitted");
  });
});

test("every table entry produces cards without throwing", () => {
  for (const item of A.items.filter((i) => i.hazardClass)) expect(afman.quantityCards(item)).toHaveLength(2);
  for (const item of C.items.filter((i) => i.hazardClass)) expect(cfr.quantityCards(item)).toHaveLength(3);
});
