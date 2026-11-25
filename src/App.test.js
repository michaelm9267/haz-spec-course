import { act, render, screen, fireEvent } from "@testing-library/react";
import App from "./App";
import afmanTable from "./data-file/item-table.json";
import { getHazardClass, splitList, findEquivalent } from "./utils/hazard";
import { parseAfmanProvisions } from "./regulations/afman";
import { loadRegulation } from "./regulations/RegulationContext";
import { cylinderContents } from "./utils/gas";

const afmanAcetoneId = afmanTable.HazData.findIndex((r) => r.UN === "UN1090");

beforeEach(() => {
  window.location.hash = "";
  localStorage.clear();
});

describe("helpers", () => {
  test("getHazardClass ignores explosive compatibility letters and typos", () => {
    expect(getHazardClass("1.1D").Class).toBe("1.1");
    expect(getHazardClass("3").Class).toBe("3");
    expect(getHazardClass("6.l").Class).toBe("6.1");
    expect(getHazardClass("Forbidden")).toBeUndefined();
  });

  test("parseAfmanProvisions splits merged codes", () => {
    expect(parseAfmanProvisions("A1, P5")).toEqual(["A1", "P5"]);
    expect(parseAfmanProvisions("N34P4")).toEqual(["N34", "P4"]);
  });

  test("splitList de-duplicates", () => {
    expect(splitList("6.1, 6.1, 8")).toEqual(["6.1", "8"]);
  });

  test("findEquivalent matches on ID number and name across regulations", () => {
    const items = [
      { id: 0, un: "UN1090", name: "Something else", pg: "I" },
      { id: 1, un: "UN1090", name: "Acetone", pg: "II" },
    ];
    expect(findEquivalent({ un: "UN1090", name: "ACETONE", pg: "" }, items).id).toBe(1);
    expect(findEquivalent({ un: "UN9999", name: "Nope" }, items)).toBeUndefined();
  });
});

describe("cylinder calculator", () => {
  test("44 L at 2,200 psig holds about 6,630 L of free gas", () => {
    const r = cylinderContents({ waterCapacity: 44, volumeUnit: "L", pressure: 2200, pressureUnit: "psig", tempC: 21.1 });
    expect(r.freeGasL).toBeCloseTo(44 * (2200 + 14.696) / 14.696, 0);
  });

  test("nitrogen mass follows the ideal gas law", () => {
    // 50 L at 200 bar gauge, 15 °C: n = PV/RT ≈ 419.5 mol -> 11.75 kg
    const r = cylinderContents({ waterCapacity: 50, volumeUnit: "L", pressure: 200, pressureUnit: "bar", tempC: 15, molarMass: 28.014 });
    expect(r.massKg).toBeCloseTo(11.75, 1);
  });

  test("returns null for empty input", () => {
    expect(cylinderContents({ waterCapacity: NaN, volumeUnit: "L", pressure: 100, pressureUnit: "psig", tempC: 20 })).toBeNull();
  });
});

describe("App", () => {
  test("defaults to the AFMAN item table", async () => {
    render(<App />);
    expect(await screen.findByRole("tab", { name: /item table \(a4\.1\)/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("radio", { name: "AFMAN 24-604" })).toHaveAttribute("aria-checked", "true");
  });

  test("searching opens the item detail page", async () => {
    render(<App />);
    await screen.findByRole("tab", { name: /item table/i });
    const search = screen.getByRole("combobox", { name: /search hazardous materials/i });
    fireEvent.change(search, { target: { value: "UN1090" } });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(await screen.findByRole("heading", { level: 1, name: /acetone/i })).toBeInTheDocument();
  });

  test("switching regulation on an item page opens the matching 49 CFR entry", async () => {
    window.location.hash = `#/afman/item/${afmanAcetoneId}`;
    render(<App />);
    expect(await screen.findByRole("heading", { level: 1, name: "ACETONE" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "49 CFR" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Acetone" })).toBeInTheDocument();
    expect(screen.getByText("Passenger aircraft/rail limit")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "§ 173.202" })).toHaveAttribute(
      "href",
      "https://www.ecfr.gov/current/title-49/section-173.202"
    );
    expect(localStorage.getItem("hazref.regulation")).toBe("cfr");
  });

  test("49 CFR tables show the HMT tab", async () => {
    window.location.hash = "#/cfr";
    render(<App />);
    expect(await screen.findByRole("tab", { name: /hazardous materials table/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByText(/current as of/i)).toBeInTheDocument();
  });

  test("calculators page shows the cylinder calculator", async () => {
    window.location.hash = "#/calculators";
    render(<App />);
    await act(() => loadRegulation("afman"));
    expect(screen.getByRole("heading", { name: /compressed gas cylinder contents/i })).toBeInTheDocument();
    expect(screen.getByText("Free gas volume (at 1 atm)")).toBeInTheDocument();
    expect(screen.getByText("6,648 L")).toBeInTheDocument(); // default Size 200: 43.8 L at 2,216 psig
  });

  test("compatibility page checks a load from the URL", async () => {
    const oxidizerId = afmanTable.HazData.findIndex((r) => r.UN === "UN1479" && r.PG === "II");
    window.location.hash = `#/compatibility?reg=afman&items=${afmanAcetoneId},${oxidizerId}`;
    render(<App />);
    await act(() => loadRegulation("afman"));
    expect(await screen.findByRole("heading", { name: /load compatibility/i })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/separation required/i);
    fireEvent.click(screen.getByRole("radio", { name: /chapter 3/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/maximum extent possible/i);
  });

  test("calculator takes the gas from a UN number and compares the mass to the 49 CFR limits", async () => {
    localStorage.setItem("hazref.regulation", "cfr");
    window.location.hash = "#/calculators?un=UN1066";
    render(<App />);
    await act(() => loadRegulation("cfr"));
    expect(await screen.findByText("Nitrogen, compressed")).toBeInTheDocument();
    expect(screen.getByText("28.014 g/mol")).toBeInTheDocument();
    expect(screen.getByText("7.71 kg")).toBeInTheDocument(); // Size 200: 43.8 L at 2,216 psig, 70 °F
    expect(screen.getByText("10% of 75 kg")).toBeInTheDocument();
  });

  test("cylinder type dropdown fills in the water capacity and pressure", async () => {
    window.location.hash = "#/calculators";
    render(<App />);
    await act(() => loadRegulation("afman"));
    const type = screen.getByRole("combobox", { name: "Cylinder type" });
    fireEvent.change(type, { target: { value: "e" } });
    expect(screen.getByDisplayValue("4.68")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2015")).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue("4.68"), { target: { value: "5" } });
    expect(type).toHaveValue("custom");
    fireEvent.change(type, { target: { value: "p20" } });
    expect(screen.getByText("Nominal net contents (by weight)")).toBeInTheDocument();
    expect(screen.queryByText("Free gas volume (at 1 atm)")).not.toBeInTheDocument();
  });

  test("calculator warns that liquefied gases are filled by weight", async () => {
    window.location.hash = "#/calculators?un=UN1013";
    render(<App />);
    await act(() => loadRegulation("afman"));
    expect(await screen.findByText(/this is a liquefied gas/i)).toBeInTheDocument();
  });

  test("calculator gas search lists only Class 2 entries", async () => {
    window.location.hash = "#/calculators";
    render(<App />);
    await act(() => loadRegulation("afman"));
    fireEvent.change(screen.getByRole("searchbox", { name: "UN number" }), { target: { value: "1066" } });
    fireEvent.click(await screen.findByRole("button", { name: /UN1066/ }));
    expect(screen.getByText("28.014 g/mol")).toBeInTheDocument();
  });

  test("course starts on the first slide", async () => {
    window.location.hash = "#/course";
    render(<App />);
    await act(() => loadRegulation("afman")); // let the background data load settle
    expect(screen.getByRole("heading", { name: /welcome to the hazmat specialist course/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
  });
});

describe("phone layout", () => {
  test("the menu button opens and closes the nav, and following a link closes it", async () => {
    await act(() => loadRegulation("afman"));
    render(<App />);
    const toggle = await screen.findByRole("button", { name: "Menu" });
    const nav = document.getElementById("site-nav");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(nav).not.toHaveClass("open");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(nav).toHaveClass("open");
    fireEvent.click(screen.getByRole("link", { name: "Calculators" }));
    expect(await screen.findByRole("heading", { name: "Calculators" })).toBeInTheDocument();
    expect(nav).not.toHaveClass("open");
  });

  test("table cells carry their column name for the stacked card layout", async () => {
    await act(() => loadRegulation("afman"));
    window.location.hash = "#/afman";
    render(<App />);
    const cell = (await screen.findAllByText("UN1090"))[0].closest("td");
    expect(cell).toHaveAttribute("data-label", "UN/ID");
    const name = cell.closest("tr").querySelector("td.cell-primary");
    expect(name).toHaveAttribute("data-label", "Proper Shipping Name");
  });
});
