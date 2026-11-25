import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "./App";
import afman from "./regulations/afman";
import cfr from "./regulations/cfr";
import { loadRegulation } from "./regulations/RegulationContext";
import { additionalDescription, basicDescription, blankDeclaration, checkDeclaration, newLine } from "./utils/declaration";
import { emergencyContacts, ergFor, ergText, loadErg } from "./utils/erg";
import { phoneNumbers } from "./components/DafForm7507";

let A;
let C;
beforeAll(async () => {
  A = await afman.load();
  C = await cfr.load();
});
beforeEach(() => {
  window.location.hash = "";
  localStorage.clear();
});

const find = (data, pred) => data.items.find(pred);
const filled = (reg, items) => ({
  ...blankDeclaration(reg),
  shipper: "Shipper",
  consignee: "Consignee",
  emergencyPhone: "800-555-0100",
  signatory: "J. Smith",
  lines: items.map((i) => ({ ...newLine(i, reg), quantity: "1" })),
});

describe("49 CFR description", () => {
  test("basic description follows § 172.202 order with subsidiary hazard and RQ", () => {
    const item = find(C, (i) => i.un === "UN2924" && i.pg === "II");
    const line = { ...newLine(item, "cfr"), technicalName: "Methanol, Sodium hydroxide", rq: true };
    expect(basicDescription(line, item)).toBe(
      "RQ, UN2924, Flammable liquids, corrosive, n.o.s. (Methanol, Sodium hydroxide), 3 (8), PG II"
    );
  });

  test("toxic-inhalation hazard zone is added", () => {
    const item = find(C, (i) => i.hazardClass === "2.3" && i.provisionCodes.includes("2"));
    expect(additionalDescription(newLine(item, "cfr"), item, blankDeclaration("cfr"))).toContain("Toxic-Inhalation Hazard, Zone B");
  });

  test("checks flag missing technical names and air quantity limits", () => {
    const acetone = find(C, (i) => i.un === "UN1090");
    const nos = find(C, (i) => i.un === "UN1993" && i.pg === "II" && i.symbols.includes("G"));
    const decl = filled("cfr", [acetone, nos]);
    decl.mode = "airPax";
    decl.lines[0].quantity = "10"; // passenger limit for acetone is 5 L
    const issues = checkDeclaration(decl, C.items, "cfr", C.substances).map((i) => i.text).join("\n");
    expect(issues).toMatch(/exceeds the passenger aircraft limit of 5 L/);
    expect(issues).toMatch(/technical name is required/);
    expect(issues).toMatch(/Acetone is a listed hazardous substance/);
  });

  test("compatibility problems are reported", () => {
    const acetone = find(C, (i) => i.un === "UN1090");
    const oxidizer = find(C, (i) => i.un === "UN1479" && i.pg === "II");
    const decl = filled("cfr", [acetone, oxidizer]);
    decl.mode = "airCao";
    expect(checkDeclaration(decl, C.items, "cfr").some((i) => /Compatibility/.test(i.text) && i.level === "error")).toBe(true);
  });
});

describe("AFMAN", () => {
  test("cargo-aircraft-only entries are flagged on passenger aircraft", () => {
    const item = find(A, (i) => i.un === "UN1089");
    const decl = filled("afman", [item]);
    expect(checkDeclaration(decl, A.items, "afman").some((i) => /cargo aircraft only/i.test(i.text))).toBe(true);
    decl.mode = "airCao";
    expect(checkDeclaration(decl, A.items, "afman").some((i) => /cargo aircraft only/i.test(i.text))).toBe(false);
  });

  test("packing paragraph is filled from the item table", () => {
    const item = find(A, (i) => i.un === "UN1090");
    expect(newLine(item, "afman").packing).toBe(item.raw.PackingPara);
  });
});

test("page builds an editable declaration from the form", async () => {
  window.location.hash = "#/declaration";
  render(<App />);
  await act(() => loadRegulation("afman"));
  fireEvent.change(screen.getByLabelText("Shipper (name and address)"), { target: { value: "75 LRS\nHill AFB, UT" } });
  fireEvent.change(screen.getByRole("searchbox", { name: "Add a hazardous material" }), { target: { value: "1090" } });
  fireEvent.click(await screen.findByRole("button", { name: /UN1090/ }));
  fireEvent.change(screen.getByLabelText("Quantity per package"), { target: { value: "1" } });
  fireEvent.click(screen.getByRole("button", { name: "Generate declaration" }));
  const doc = screen.getByLabelText("Shipper's declaration (editable)");
  expect(doc).toHaveAttribute("contenteditable", "true");
  expect(within(doc).getAllByText(/DAF FORM 7507, 20250131/)).toHaveLength(2); // both pages
  expect(within(doc).getByText("SHIPPER'S CHECKLIST")).toBeInTheDocument();
  expect(within(doc).getByText("UN1090")).toBeInTheDocument();
  expect(within(doc).getByText(/1 Fiberboard box \(4G\) × 1 L/)).toBeInTheDocument();
  expect(within(doc).getByText(/Hill AFB, UT/)).toBeInTheDocument();
  // the draft survives a reload
  expect(JSON.parse(localStorage.getItem("hazref.declaration.afman")).lines).toHaveLength(1);
});

describe("ERG emergency response information", () => {
  let erg;
  beforeAll(async () => {
    erg = await loadErg();
  });
  const cfrItem = (un) => find(C, (i) => i.un === un);

  test("ID numbers resolve to ERG2024 guides, with green (TIH) entries flagged", () => {
    expect(ergFor(erg, cfrItem("UN1203"))).toMatchObject({ guide: "128", title: "Flammable Liquids (Water-Immiscible)", tih: false });
    expect(ergFor(erg, cfrItem("UN1017"))).toMatchObject({ guide: "124", tih: true });
    expect(ergFor(erg, cfrItem("UN1051"))).toMatchObject({ guide: "117P", tih: true });
    expect(ergFor(erg, find(A, (i) => i.un === "UN3480"))).toMatchObject({ guide: "147" });
  });

  test("an ID with several guides uses the entry that matches the shipping name", () => {
    expect(ergFor(erg, find(C, (i) => i.un === "NA1057")).guide).toBe("128");
    expect(ergFor(erg, find(C, (i) => i.un === "UN1057" && /^Lighters/.test(i.name))).guide).toBe("115");
  });

  test("Class 1 uses the ERG's division rows (112 / 114)", () => {
    expect(ergFor(erg, find(C, (i) => /^1\.1/.test(i.hazardClass) && i.un)).guide).toBe("112");
    expect(ergFor(erg, find(C, (i) => /^1\.4/.test(i.hazardClass) && i.un)).guide).toBe("114");
  });

  test("ergText lists each UN number once", () => {
    const text = ergText(erg, [cfrItem("UN1203"), cfrItem("UN1017"), cfrItem("UN1203")]);
    expect(text.split("\n")).toEqual([
      "UN1203: ERG2024 Guide 128 — Flammable Liquids (Water-Immiscible)",
      "UN1017: ERG2024 Guide 124 — Gases - Toxic and/or Corrosive - Oxidizing; toxic inhalation hazard — use Table 1 initial isolation and protective action distances",
    ]);
  });

  test("checkDeclaration warns when an entry is not in the ERG", () => {
    const sample = find(C, (i) => i.un === "UN0190");
    const decl = { ...filled("cfr", C.items), lines: [{ ...newLine(sample, "cfr"), packages: "1", quantity: "1" }] };
    expect(checkDeclaration(decl, C.items, "cfr", [], erg).some((x) => /UN0190 is not listed in the ERG2024/.test(x.text))).toBe(true);
  });

  test("the form fills emergency response information from the UN numbers added, until edited", async () => {
    window.location.hash = "#/declaration";
    render(<App />);
    await act(() => loadRegulation("afman"));
    const box = await screen.findByLabelText(/^Emergency response information/);
    expect(box.value).toBe("");
    fireEvent.change(screen.getByRole("searchbox", { name: "Add a hazardous material" }), { target: { value: "1090" } });
    fireEvent.click(await screen.findByRole("button", { name: /UN1090/ }));
    await waitFor(() => expect(box.value).toMatch(/^UN1090: ERG2024 Guide 127 — Flammable Liquids \(Water-Miscible\)/));
    expect(screen.getByText("ERG 127")).toBeInTheDocument();

    fireEvent.change(box, { target: { value: "Call CHEMTREC" } });
    expect(box.value).toBe("Call CHEMTREC");
    fireEvent.click(screen.getByRole("button", { name: "Fill from UN numbers" }));
    expect(box.value).toMatch(/^UN1090: ERG2024 Guide 127/);

    fireEvent.change(screen.getByLabelText("Quantity per package"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate declaration" }));
    let doc = screen.getByLabelText("Shipper's declaration (editable)");
    expect(within(doc).getByText("ADDITIONAL HANDLING INFORMATION")).toBeInTheDocument();
    // DAF Form 7507 leaves the ERG off unless asked for
    expect(within(doc).queryByText(/UN1090: ERG2024 Guide 127/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Print ERG guides on the form/));
    fireEvent.click(screen.getByRole("button", { name: "Regenerate declaration" }));
    doc = screen.getByLabelText("Shipper's declaration (editable)");
    expect(within(doc).getByText(/UN1090: ERG2024 Guide 127/)).toBeInTheDocument();
  });
});

describe("DoD emergency phone and agency (ERG2024 military shipments)", () => {
  const item = (pred) => find(A, pred);
  const acetone = () => item((i) => i.un === "UN1090");
  const explosive = () => item((i) => /^1\.4/.test(i.hazardClass) && i.un);

  test("explosives go to the Army Operations Center, everything else to DLA", () => {
    expect(emergencyContacts([explosive()])).toEqual({ phone: "703-695-4695/4696", contact: "U.S. Army Operations Center (DoD)" });
    expect(emergencyContacts([acetone()])).toEqual({ phone: "1-800-851-8061", contact: "Defense Logistics Agency (DoD)" });
    expect(emergencyContacts([])).toEqual({ phone: "", contact: "" });
  });

  test("a mixed load lists both numbers, labelled", () => {
    expect(emergencyContacts([acetone(), explosive()])).toEqual({
      phone: "703-695-4695/4696 (explosives/ammunition); 1-800-851-8061 (all other hazardous materials)",
      contact: "U.S. Army Operations Center (explosives/ammunition); Defense Logistics Agency (all other hazardous materials)",
    });
  });

  test("the form fills the phone and agency, keeps an override, and restores when cleared", async () => {
    window.location.hash = "#/declaration";
    render(<App />);
    await act(() => loadRegulation("afman"));
    const phone = screen.getByLabelText(/^24-hour emergency response telephone/);
    const agency = screen.getByLabelText(/^Emergency contact \/ agency/);
    expect(phone.value).toBe("");
    fireEvent.change(screen.getByRole("searchbox", { name: "Add a hazardous material" }), { target: { value: "1090" } });
    fireEvent.click(await screen.findByRole("button", { name: /UN1090/ }));
    expect(phone.value).toBe("1-800-851-8061");
    expect(agency.value).toBe("Defense Logistics Agency (DoD)");

    fireEvent.change(phone, { target: { value: "555-0100" } });
    expect(phone.value).toBe("555-0100");
    fireEvent.change(phone, { target: { value: "" } });
    expect(phone.value).toBe("1-800-851-8061");

    fireEvent.change(screen.getByLabelText("Quantity per package"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate declaration" }));
    const doc = screen.getByLabelText("Shipper's declaration (editable)");
    // numbers only on the form's emergency line
    expect(within(doc).getByText("1-800-851-8061")).toBeInTheDocument();
    expect(within(doc).queryByText(/Defense Logistics Agency/)).not.toBeInTheDocument();
  });
});

describe("emergency contacts: dual hazards and international shipments", () => {
  const acetone = () => find(A, (i) => i.un === "UN1090");
  const explosive = () => find(A, (i) => /^1\.4/.test(i.hazardClass) && i.un);
  const peroxideB = () => find(A, (i) => i.un === "UN3101");

  test("an entry with an explosive subsidiary hazard lists both numbers", () => {
    expect(peroxideB().subsidiaryHazards).toContain("1");
    expect(emergencyContacts([peroxideB()]).phone).toBe(
      "703-695-4695/4696 (explosives/ammunition); 1-800-851-8061 (all other hazardous materials)"
    );
  });

  test("Class 3 plus an explosive lists both, labelled", () => {
    expect(emergencyContacts([acetone(), explosive()]).contact).toBe(
      "U.S. Army Operations Center (explosives/ammunition); Defense Logistics Agency (all other hazardous materials)"
    );
  });

  test("international gives the Army number in +1 form and warns about the toll-free DLA line", () => {
    expect(emergencyContacts([explosive()], { international: true }).phone).toBe("+1-703-695-4695/4696 (collect calls accepted)");
    expect(emergencyContacts([acetone(), explosive()], { international: true }).phone).toBe(
      "+1-703-695-4695/4696 (explosives/ammunition, collect calls accepted); 1-800-851-8061 (all other hazardous materials)"
    );
    const decl = { ...filled("afman", A.items), international: true, emergencyPhone: "1-800-851-8061" };
    expect(checkDeclaration(decl, A.items, "afman").some((x) => /International shipment: a toll-free/.test(x.text))).toBe(true);
    expect(checkDeclaration({ ...decl, international: false }, A.items, "afman").some((x) => /toll-free/.test(x.text))).toBe(false);
  });

  test("ticking International shipment switches the Army number to +1 form", async () => {
    window.location.hash = "#/declaration";
    render(<App />);
    await act(() => loadRegulation("afman"));
    const ex = explosive();
    fireEvent.change(screen.getByRole("searchbox", { name: "Add a hazardous material" }), { target: { value: ex.un.slice(2) } });
    fireEvent.click((await screen.findAllByRole("button", { name: new RegExp(ex.un) }))[0]);
    const phone = screen.getByLabelText(/^24-hour emergency response telephone/);
    expect(phone.value).toBe("703-695-4695/4696");
    fireEvent.click(screen.getByLabelText(/International shipment/));
    expect(phone.value).toBe("+1-703-695-4695/4696 (collect calls accepted)");
  });
});

describe("DAF Form 7507 output", () => {
  const generate = async (setup) => {
    window.location.hash = "#/declaration";
    render(<App />);
    await act(() => loadRegulation("afman"));
    fireEvent.change(screen.getByRole("searchbox", { name: "Add a hazardous material" }), { target: { value: "1090" } });
    fireEvent.click(await screen.findByRole("button", { name: /UN1090/ }));
    fireEvent.change(screen.getByLabelText("Quantity per package"), { target: { value: "1" } });
    setup?.();
    fireEvent.click(screen.getByRole("button", { name: "Generate declaration" }));
    return screen.getByLabelText("Shipper's declaration (editable)");
  };

  test("fills the form's fields and strikes the non-applicable choices", async () => {
    const doc = await generate(() => {
      fireEvent.change(screen.getByLabelText("Shipper phone number"), { target: { value: "801-777-1234" } });
      fireEvent.change(screen.getByLabelText("Shipper DSN"), { target: { value: "777-1234" } });
      fireEvent.change(screen.getByLabelText("Air waybill no."), { target: { value: "AWB-42" } });
    });
    expect(within(doc).getByText("801-777-1234")).toBeInTheDocument();
    expect(within(doc).getByText("777-1234")).toBeInTheDocument();
    expect(within(doc).getByText("AWB-42")).toBeInTheDocument();
    expect(within(doc).getByText("RADIOACTIVE")).toHaveClass("deleted");
    expect(within(doc).getByText("NON-RADIOACTIVE")).not.toHaveClass("deleted");
    expect(within(doc).getByText(/^CARGO AIRCRAFT/)).toHaveClass("deleted");
    expect(within(doc).getByText(/I declare that all of the applicable air transport requirements have been met/)).toBeInTheDocument();
    expect(within(doc).getByText("UN1090")).toBeInTheDocument();
  });

  test("red borders are on by default and can be turned off (remembered)", async () => {
    const doc = await generate();
    const toggle = screen.getByLabelText("Red borders");
    expect(toggle).toBeChecked();
    expect(doc.parentElement).toHaveClass("f7507-borders");
    fireEvent.click(toggle);
    expect(doc.parentElement).not.toHaveClass("f7507-borders");
    expect(localStorage.getItem("hazref.declaration.redBorders")).toBe("off");
  });

  test("old drafts get the DAF Form 7507 certification", async () => {
    localStorage.setItem(
      "hazref.declaration.afman",
      JSON.stringify({
        ...blankDeclaration("afman"),
        certification:
          "I hereby certify that the contents of this consignment are fully and accurately described above by the proper shipping name, and are classified, packaged, marked and labeled/placarded, and are in all respects in proper condition for transport by military aircraft according to AFMAN 24-604 and applicable international and national governmental regulations.",
      })
    );
    window.location.hash = "#/declaration";
    render(<App />);
    await act(() => loadRegulation("afman"));
    const cert = screen.getAllByRole("textbox").find((t) => /contents of this consignment/.test(t.value));
    expect(cert.value).toMatch(/^I hereby declare that the contents/);
  });
});

describe("DAF Form 7507 emergency telephone number", () => {
  test("drops agency and scope labels, keeping every number", () => {
    expect(phoneNumbers("1-800-851-8061")).toBe("1-800-851-8061");
    expect(
      phoneNumbers("+1-703-695-4695/4696 (explosives/ammunition, collect calls accepted); 1-800-851-8061 (all other hazardous materials)")
    ).toBe("+1-703-695-4695/4696; 1-800-851-8061");
    expect(phoneNumbers("")).toBe("");
  });
});

describe("DAF Form 7507 identification and quantity columns", () => {
  const { formExtras, formQuantity } = require("./components/DafForm7507");
  const explosive = { hazardClass: "1.4S", provisionCodes: [], cargoOnly: false };
  const flammable = { hazardClass: "3", provisionCodes: [], cargoOnly: true };
  const line = (o) => ({ ...newLine({ id: "x", name: "", raw: {} }, "afman"), packages: "2", packageType: "Fiberboard box (4G)", quantity: "2.5", unit: "kg", ...o });

  test("NEW replaces the actual mass in the quantity column for Class 1", () => {
    expect(formQuantity(line({ netExplosive: "0.5" }), explosive)).toBe("2 Fiberboard box (4G) × NEW 0.5 kg");
    expect(formExtras(line({ netExplosive: "0.5" }), explosive, { mode: "airPax" })).toEqual([]);
    // no NEW entered yet: falls back to the quantity per package
    expect(formQuantity(line({ netExplosive: "" }), explosive)).toBe("2 Fiberboard box (4G) × 2.5 kg");
    expect(formQuantity(line({ unit: "L" }), flammable)).toBe("2 Fiberboard box (4G) × 2.5 L");
  });

  test("Cargo Aircraft Only is left to the aircraft limitation box", () => {
    expect(formExtras(line(), flammable, { mode: "airCao" })).toEqual([]);
    expect(formExtras(line({ limitedQuantity: true }), flammable, { mode: "airPax" })).toEqual([]);
  });
});

describe("DAF Form 7507 RQ and LTD QTY placement", () => {
  test("RQ goes under the UN number and LTD QTY in the authorization column", () => {
    const DafForm7507 = require("./components/DafForm7507").default;
    const item = { un: "UN1993", name: "Flammable liquid, n.o.s.", hazardClass: "3", pg: "III", provisionCodes: [], raw: {} };
    const line = { ...newLine(item, "afman"), rq: true, limitedQuantity: true, authorization: "SP A3", quantity: "1" };
    const decl = { ...blankDeclaration("afman"), mode: "airPax" };
    const { container } = render(<DafForm7507 decl={decl} lines={[{ line, item }]} />);
    const cells = container.querySelectorAll(".f7507-item td");
    expect(cells[0].textContent).toBe("UN1993RQ");
    expect(cells[0].querySelector("div").textContent).toBe("RQ");
    expect(cells[1].textContent).not.toMatch(/RQ|Limited Quantity/);
    expect(cells[6].textContent).toBe("SP A3LTD QTY");
  });
});

describe("DAF Form 7507 pagination", () => {
  const { paginate } = require("./components/DafForm7507");
  test("moves the last item of an overflowing page to the next page", () => {
    expect(paginate([5], [false])).toBeNull();
    expect(paginate([5], [true])).toEqual([4, 1]);
    expect(paginate([4, 1], [true, false])).toEqual([3, 2]);
    expect(paginate([3, 2], [false, true])).toEqual([3, 1, 1]);
    // one item taller than the box stays where it is
    expect(paginate([1], [true])).toBeNull();
  });
});
