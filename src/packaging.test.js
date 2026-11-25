import { act, fireEvent, render, screen, within } from "@testing-library/react";
import App from "./App";
import { loadRegulation } from "./regulations/RegulationContext";
import { containersFor, declarationLines, defaultState, hazardLabels, newPackage, packagingPlan, withPackages } from "./utils/packaging";
import { blankDeclaration, newLine } from "./utils/declaration";

let afman;
let cfr;
beforeAll(async () => {
  [afman, cfr] = await Promise.all([loadRegulation("afman"), loadRegulation("cfr")]);
});
beforeEach(() => {
  window.location.hash = "";
  localStorage.clear();
});

const find = (data, un, pg) => data.items.find((i) => i.un === un && (!pg || i.pg === pg) && i.hazardClass);
const pkg = (item, o = {}) => ({ ...newPackage(item), ...o });
const keys = (list) => list.map((x) => x.key);

describe("packagingPlan", () => {
  test("AFMAN liquid in a combination package: UN spec, arrows, AIR ELIGIBLE, primary label", () => {
    const item = find(afman, "UN1090");
    const plan = packagingPlan(item, pkg(item, { innerQty: "1", inners: "4" }), { regKey: "afman", mode: "airPax" });
    expect(plan.shape).toBe("box");
    expect(keys(plan.marks)).toEqual(["psn", "address", "spec", "arrows", "airEligible"]);
    expect(plan.marks[0].text).toBe("UN1090 ACETONE");
    expect(plan.marks.find((m) => m.key === "spec").text).toMatch(/^4G\/Y/);
    expect(plan.labels.map((l) => l.code)).toEqual(["3"]);
    expect(plan.packaging[0].text).toMatch(/packing paragraph A7\.2/);
    expect(plan.quantity.text).toBe("4 L");
  });

  test("gases go in a cylinder with no orientation arrows", () => {
    const item = find(cfr, "UN1066");
    expect(defaultState(item)).toBe("gas");
    const plan = packagingPlan(item, pkg(item), { regKey: "cfr", mode: "highway" });
    expect(plan.shape).toBe("cylinder");
    expect(keys(plan.marks)).not.toContain("arrows");
    expect(plan.labels.map((l) => l.code)).toEqual(["2.2"]);
  });

  test("49 CFR air: over the passenger aircraft limit adds the Cargo Aircraft Only label", () => {
    const item = find(cfr, "UN1090");
    const plan = packagingPlan(item, pkg(item, { innerQty: "5", inners: "4" }), { regKey: "cfr", mode: "airPax" });
    expect(plan.cao).toBe(true);
    expect(plan.labels.map((l) => l.code)).toEqual(["3", "CAO"]);
    expect(plan.warnings.join(" ")).toMatch(/exceeds the passenger aircraft limit of 5 L/);
    // within the limit: no CAO
    const ok = packagingPlan(item, pkg(item, { innerQty: "1", inners: "4" }), { regKey: "cfr", mode: "airPax" });
    expect(ok.cao).toBe(false);
  });

  test("limited quantity by highway: LQ mark, no UN spec mark, no labels", () => {
    const item = find(cfr, "UN1263", "II");
    const plan = packagingPlan(item, pkg(item, { innerQty: "1", inners: "4", limitedQuantity: true }), { regKey: "cfr", mode: "highway" });
    expect(plan.lq.applies).toBe(true);
    expect(keys(plan.marks)).toContain("lq");
    expect(keys(plan.marks)).not.toContain("spec");
    expect(plan.labels).toEqual([]);
  });

  test("limited quantity by air keeps the labels and uses the Y mark; over the inner limit it doesn't apply", () => {
    const item = find(cfr, "UN1263", "II");
    const plan = packagingPlan(item, pkg(item, { innerQty: "0.5", inners: "2", limitedQuantity: true }), { regKey: "cfr", mode: "airPax" });
    expect(plan.lq.applies).toBe(true);
    expect(plan.marks.find((m) => m.key === "lq").text).toMatch(/“Y”/);
    expect(plan.labels.map((l) => l.code)).toEqual(["3"]);
    const big = packagingPlan(item, pkg(item, { innerQty: "2", inners: "1", limitedQuantity: true }), { regKey: "cfr", mode: "airPax" });
    expect(big.lq.applies).toBe(false);
    expect(big.warnings.join(" ")).toMatch(/inner receptacle exceeds/);
  });

  test("PG I isn't eligible as a limited quantity", () => {
    const item = find(cfr, "UN1993", "I");
    const plan = packagingPlan(item, pkg(item, { limitedQuantity: true }), { regKey: "cfr", mode: "airPax" });
    expect(plan.lq.applies).toBe(false);
    expect(plan.warnings[0]).toMatch(/Not eligible as a limited quantity/);
  });

  test("RQ, technical name, inhalation hazard and subsidiary labels", () => {
    const item = find(cfr, "UN1017");
    const plan = packagingPlan(item, pkg(item, { rq: true }), { regKey: "cfr", mode: "highway" });
    expect(plan.marks[0].text).toMatch(/^RQ UN1017 /);
    expect(keys(plan.marks)).toContain("inhalation");
    expect(hazardLabels(item, "cfr").length).toBeGreaterThan(1);
    expect(plan.labels[0].primary).toBe(true);

    const nos = find(cfr, "UN1993", "II");
    const p2 = packagingPlan(nos, pkg(nos, { technicalName: "Toluene" }), { regKey: "cfr", mode: "highway" });
    expect(p2.marks[0].text).toBe("UN1993 Flammable liquids, n.o.s. (Toluene)");
  });

  test("forbidden and air-forbidden entries are blocked", () => {
    const item = find(cfr, "UN1005");
    expect(packagingPlan(item, pkg(item), { regKey: "cfr", mode: "airPax" }).blocked).toMatch(/Forbidden on both/);
    expect(packagingPlan(item, pkg(item), { regKey: "cfr", mode: "highway" }).blocked).toBeNull();
    // combustible liquids aren't blocked (AFMAN lists them under A7.2) but get no hazard label
    const afComb = afman.items.find((i) => /^comb/i.test(i.hazardClass.replace(/\s/g, "")));
    const cfrComb = cfr.items.find((i) => i.hazardClass === "Comb liq");
    for (const [it, regKey] of [[afComb, "afman"], [cfrComb, "cfr"]]) {
      const plan = packagingPlan(it, pkg(it), { regKey, mode: "airPax" });
      expect(plan.blocked).toBeNull();
      expect(plan.labels).toEqual([]);
      expect(plan.warnings[0]).toMatch(/^Combustible liquid/);
    }
  });
});

describe("Packaging guide page", () => {
  test("adding a material shows the drawing and the lists, and the list is remembered", async () => {
    await act(() => loadRegulation("afman"));
    window.location.hash = "#/packaging";
    const { unmount } = render(<App />);
    fireEvent.change(await screen.findByLabelText("Add a material to package"), { target: { value: "UN1090" } });
    fireEvent.click((await screen.findAllByRole("button", { name: /UN1090 ACETONE/ }))[0]);
    const card = await screen.findByRole("region", { name: "UN1090 ACETONE" });
    expect(within(card).getByRole("img", { name: /Illustration of the package for UN1090 ACETONE/ })).toBeInTheDocument();
    expect(within(card).getByRole("heading", { name: "Marking" })).toBeInTheDocument();
    expect(within(card).getByText("Primary hazard label: 3")).toBeInTheDocument();
    expect(within(card).getByText("AIR ELIGIBLE", { selector: "strong" })).toBeInTheDocument();
    unmount();

    render(<App />);
    expect(await screen.findByRole("region", { name: "UN1090 ACETONE" })).toBeInTheDocument();
  });
});

describe("container types", () => {
  test("containers on offer depend on the physical state", () => {
    expect(containersFor("liquid")).toEqual(expect.arrayContaining(["4G", "1A1", "1H1", "3A1", "3H1", "6HA1", "1A2o"]));
    expect(containersFor("liquid")).not.toContain("1A2");
    expect(containersFor("solid")).toEqual(expect.arrayContaining(["4G", "1A2", "1H2", "1G"]));
    expect(containersFor("solid")).not.toContain("1A1");
    expect(containersFor("gas")).toEqual(["cyl"]);
  });

  test("a liquid in a closed-head drum is a single packaging: liquid spec mark, no arrows or AIR ELIGIBLE", () => {
    const item = find(afman, "UN1090");
    const plan = packagingPlan(item, pkg(item, { container: "1A1", innerQty: "200", inners: "3" }), { regKey: "afman", mode: "airCao" });
    expect(plan.shape).toBe("drum");
    expect(plan.single).toBe(true);
    expect(plan.marks.find((m) => m.key === "spec").text).toBe("1A1/Y1.2/150/yy/USA/…");
    expect(keys(plan.marks)).not.toContain("arrows");
    expect(keys(plan.marks)).not.toContain("airEligible");
    expect(plan.packaging.some((p) => /^Single packaging: steel drum, closed head \(1A1\)/.test(p.text))).toBe(true);
    // the inner count doesn't apply to a single packaging
    expect(plan.quantity.text).toBe("200 L");
  });

  test("jerricans, outer drums and solids in open-head drums", () => {
    const item = find(cfr, "UN1090");
    expect(packagingPlan(item, pkg(item, { container: "3H1" }), { regKey: "cfr", mode: "highway" }).shape).toBe("jerrican");
    const outer = packagingPlan(item, pkg(item, { container: "1H2o" }), { regKey: "cfr", mode: "highway" });
    expect(outer.shape).toBe("drum");
    expect(outer.single).toBe(false);
    expect(keys(outer.marks)).toContain("arrows");
    expect(outer.marks.find((m) => m.key === "spec").text).toMatch(/^1H2\/Y30\/S\//);

    const solid = find(cfr, "UN1759", "II");
    const plan = packagingPlan(solid, pkg(solid, { state: "solid", container: "1A2" }), { regKey: "cfr", mode: "highway" });
    expect(plan.single).toBe(true);
    expect(plan.marks.find((m) => m.key === "spec").text).toMatch(/^1A2\/Y30\/S\//);
  });

  test("a container that doesn't suit the state falls back to the default", () => {
    const item = find(cfr, "UN1090");
    expect(packagingPlan(item, pkg(item, { state: "liquid", container: "1A2" }), { regKey: "cfr", mode: "highway" }).container.code).toBe("4G");
  });

  test("limited quantities can't go in a single packaging", () => {
    const item = find(cfr, "UN1263", "II");
    const plan = packagingPlan(item, pkg(item, { container: "1H1", limitedQuantity: true, innerQty: "1" }), { regKey: "cfr", mode: "highway" });
    expect(plan.lq.applies).toBe(false);
    expect(plan.warnings.join(" ")).toMatch(/combination packagings/);
    expect(plan.labels.map((l) => l.code)).toEqual(["3"]);
  });

  test("the page offers the containers and switches the drawing", async () => {
    await act(() => loadRegulation("cfr"));
    localStorage.setItem("hazref.regulation", "cfr");
    window.location.hash = "#/packaging";
    render(<App />);
    fireEvent.change(await screen.findByLabelText("Add a material to package"), { target: { value: "UN1090" } });
    fireEvent.click((await screen.findAllByRole("button", { name: /UN1090 Acetone/ }))[0]);
    const card = await screen.findByRole("region", { name: "UN1090 Acetone" });
    const select = within(card).getByLabelText(/^Container/);
    expect(within(select).getByRole("option", { name: "Steel drum, closed head (1A1)" })).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "1A1" } });
    expect(within(card).getByRole("img", { name: /Illustration of the drum/ })).toBeInTheDocument();
    expect(within(card).getByLabelText("Quantity in the drum")).toBeInTheDocument();
    expect(within(card).queryByLabelText(/Inner receptacles/)).not.toBeInTheDocument();
  });
});

describe("packages to the shipper's declaration", () => {
  test("declarationLines carries container, quantity per package, count, NEW, RQ and LTD QTY", () => {
    const acetone = find(afman, "UN1090");
    const cartridges = find(afman, "UN0012");
    const packages = [
      pkg(acetone, { innerQty: "1", inners: "4", count: "2" }),
      pkg(cartridges, { state: "solid", innerQty: "2.5", unit: "kg", netExplosive: "0.5" }),
      pkg(acetone, { container: "1H1", innerQty: "200", rq: true }),
    ];
    const { lines, skipped } = declarationLines(packages, afman.items, { regKey: "afman", mode: "airCao" });
    expect(skipped).toEqual([]);
    expect(lines[0]).toMatchObject({ id: acetone.id, packages: "2", packageType: "Fiberboard box (4G)", quantity: "4", unit: "L", packing: "A7.2." });
    expect(lines[1]).toMatchObject({ packageType: "Fiberboard box (4G)", quantity: "2.5", unit: "kg", netExplosive: "0.5" });
    expect(lines[2]).toMatchObject({ packageType: "Plastic drum (1H1)", quantity: "200", rq: true, limitedQuantity: false });

    const lq = find(afman, "UN1263", "II") || find(afman, "UN1263");
    const { lines: lqLines } = declarationLines([pkg(lq, { innerQty: "0.5", limitedQuantity: true })], afman.items, { regKey: "afman", mode: "airPax" });
    expect(lqLines[0].limitedQuantity).toBe(true);
  });

  test("withPackages keeps what's already entered, replaces or adds lines, and sets the mode", () => {
    const acetone = find(cfr, "UN1090");
    const decl = { ...blankDeclaration("cfr"), shipper: "65 LRS", lines: [{ ...newLine(acetone, "cfr"), quantity: "9" }] };
    const replaced = withPackages(decl, [pkg(acetone, { innerQty: "1" })], cfr.items, { regKey: "cfr", mode: "airPax" });
    expect(replaced.decl.shipper).toBe("65 LRS");
    expect(replaced.decl.mode).toBe("airPax");
    expect(replaced.decl.lines).toHaveLength(1);
    expect(replaced.decl.lines[0].quantity).toBe("1");
    const added = withPackages(decl, [pkg(acetone, { innerQty: "1" })], cfr.items, { regKey: "cfr", mode: "highway", replace: false });
    expect(added.decl.lines.map((l) => l.quantity)).toEqual(["9", "1"]);
    // forbidden entries are left out
    const forbidden = cfr.items.find((i) => i.forbidden);
    expect(declarationLines([pkg(forbidden)], cfr.items, { regKey: "cfr", mode: "highway" }).skipped).toHaveLength(1);
  });

  test("Create DAF Form 7507 opens the declaration with the form generated", async () => {
    await act(() => loadRegulation("afman"));
    localStorage.setItem("hazref.regulation", "afman");
    window.location.hash = "#/packaging";
    render(<App />);
    fireEvent.change(await screen.findByLabelText("Add a material to package"), { target: { value: "UN1090" } });
    fireEvent.click((await screen.findAllByRole("button", { name: /UN1090 ACETONE/ }))[0]);
    const card = await screen.findByRole("region", { name: "UN1090 ACETONE" });
    fireEvent.change(within(card).getByLabelText("Quantity per inner receptacle"), { target: { value: "1" } });
    fireEvent.change(within(card).getByLabelText(/^Number of packages like this/), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Create DAF Form 7507" }));

    expect(await screen.findByText(/Filled in from the/)).toBeInTheDocument();
    const doc = await screen.findByLabelText("Shipper's declaration (editable)");
    expect(within(doc).getAllByText("SHIPPER'S DECLARATION FOR DANGEROUS GOODS").length).toBeGreaterThan(0);
    expect(within(doc).getByText("UN1090")).toBeInTheDocument();
    expect(within(doc).getByText(/3 Fiberboard box \(4G\) × 1 L/)).toBeInTheDocument();
    expect(within(doc).getByText("1-800-851-8061")).toBeInTheDocument();
  });
});

describe("limited quantity suggestion", () => {
  const acetone = () => find(afman, "UN1090");

  test("suggests a limited quantity when the UN number and quantities qualify", () => {
    const item = acetone();
    const plan = packagingPlan(item, pkg(item, { innerQty: "0.5", inners: "2" }), { regKey: "afman", mode: "airPax" });
    expect(plan.lqSuggestion.status).toBe("yes");
    expect(plan.lqSuggestion.row.inner).toBe("500 mL");
    // not applied until the user chooses it
    expect(plan.lq).toBeNull();
    expect(plan.marks.map((m) => m.key)).toContain("spec");
  });

  test("says what's over when the entry allows it but the package doesn't", () => {
    const item = acetone();
    const s = packagingPlan(item, pkg(item, { innerQty: "2", inners: "4" }), { regKey: "afman", mode: "airPax" }).lqSuggestion;
    expect(s.status).toBe("over");
    expect(s.problems.join(" ")).toMatch(/inner receptacle exceeds the limited quantity limit of 500 mL/);
    const drum = packagingPlan(item, pkg(item, { container: "1A1", innerQty: "200" }), { regKey: "afman", mode: "airPax" }).lqSuggestion;
    expect(drum.status).toBe("over");
    expect(drum.problems).toEqual([expect.stringMatching(/combination packagings/)]);
  });

  test("asks for a quantity, and stays quiet for entries that can't be a limited quantity", () => {
    const item = acetone();
    expect(packagingPlan(item, pkg(item), { regKey: "afman", mode: "airPax" }).lqSuggestion.status).toBe("noqty");
    const pg1 = find(cfr, "UN1993", "I");
    expect(packagingPlan(pg1, pkg(pg1, { innerQty: "0.1" }), { regKey: "cfr", mode: "airPax" }).lqSuggestion).toBeNull();
  });

  test("ticking it applies the limited quantity; ground rules differ from air", () => {
    const paint = find(cfr, "UN1263", "II");
    const ground = packagingPlan(paint, pkg(paint, { innerQty: "1", inners: "4" }), { regKey: "cfr", mode: "highway" });
    expect(ground.lqSuggestion.status).toBe("yes");
    const applied = packagingPlan(paint, pkg(paint, { innerQty: "1", inners: "4", limitedQuantity: true }), { regKey: "cfr", mode: "highway" });
    expect(applied.lq.applies).toBe(true);
    expect(applied.lqSuggestion).toBeNull();
  });

  test("the Use limited quantity button ticks it and switches a drum to a box", async () => {
    await act(() => loadRegulation("afman"));
    localStorage.setItem("hazref.regulation", "afman");
    localStorage.setItem(
      "hazref.packaging.afman",
      JSON.stringify({ mode: "airPax", packages: [{ ...pkg(acetone(), { innerQty: "0.5", inners: "2" }) }] })
    );
    window.location.hash = "#/packaging";
    render(<App />);
    const card = await screen.findByRole("region", { name: "UN1090 ACETONE" });
    expect(within(card).getByText(/Suggested: ship as a limited quantity/)).toBeInTheDocument();
    fireEvent.click(within(card).getByRole("button", { name: "Use limited quantity" }));
    expect(within(card).getByLabelText(/Ship as a limited quantity/)).toBeChecked();
    expect(within(card).queryByText(/Suggested: ship as a limited quantity/)).not.toBeInTheDocument();
    expect(within(card).getByText("Limited quantity mark with “Y”")).toBeInTheDocument();
  });
});
