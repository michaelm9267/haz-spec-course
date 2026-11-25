import fs from "fs";
import path from "path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { formatAddress, isPlaceholder, loadDodaacDb, lookupDodaac, searchDodaacs } from "./utils/dodaac";

// Open the real bundled database with sql.js under Node. The wasm binary is
// passed in directly because jsdom makes sql.js think it is in a browser.
const ROOT = path.join(__dirname, "..");
const initSqlJs = () =>
  require("sql.js")({ wasmBinary: fs.readFileSync(path.join(ROOT, "node_modules/sql.js/dist/sql-wasm.wasm")) });
const fetchImpl = async () => {
  const buf = fs.readFileSync(path.join(ROOT, "public/data/DODAACs.sqlite"));
  return { ok: true, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
};

let db;
beforeAll(async () => {
  db = await loadDodaacDb({ initSqlJs, fetchImpl });
});
beforeEach(() => {
  window.location.hash = "";
  localStorage.clear();
});

describe("lookupDodaac", () => {
  test("returns the address for a code, case-insensitively, with clean ports", () => {
    const [a, ...rest] = lookupDodaac(db, "fb2029");
    expect(rest).toHaveLength(0);
    expect(a).toMatchObject({ dodaac: "FB2029", city: "HILL AFB", state: "UT", zip: "84056", apoe: "HIF", overseas: false });
    expect(a.types).toEqual(["D", "M"]);
  });

  test("collapses duplicate rows and puts the most-used address first", () => {
    const list = lookupDodaac(db, "FB4486");
    expect(list[0]).toMatchObject({ name: "FB4486 65 LRS LGRDDC", city: "TERCEIRA ISLAND", country: "PT", overseas: true });
    expect(list[0].records).toBeGreaterThan(50);
    expect(list.length).toBeLessThan(5);
  });

  test("ignores malformed rows and rejects non-codes", () => {
    expect(lookupDodaac(db, "")).toEqual([]);
    expect(lookupDodaac(db, "x' OR 1=1--")).toEqual([]);
    expect(lookupDodaac(db, "ZZZZZZ")).toEqual([]);
  });

  test("flags generic codes shared by many organizations", () => {
    expect(isPlaceholder(lookupDodaac(db, "FB0000"))).toBe(true);
    expect(isPlaceholder(lookupDodaac(db, "FB2029"))).toBe(false);
  });
});

describe("searchDodaacs", () => {
  test("code prefixes come first, in code order", () => {
    const codes = searchDodaacs(db, "FB20", 5).map((a) => a.dodaac);
    expect(codes).toEqual([...codes].sort());
    expect(codes.every((c) => c.startsWith("FB20"))).toBe(true);
  });

  test("finds by base name, most-used DoDAACs first", () => {
    const hits = searchDodaacs(db, "hill afb", 5);
    expect(hits[0].dodaac).toBe("FB2029");
    expect(hits.every((a) => a.city === "HILL AFB")).toBe(true);
  });

  test("treats LIKE wildcards literally and needs two characters", () => {
    expect(searchDodaacs(db, "%%")).toEqual([]);
    expect(searchDodaacs(db, "F")).toEqual([]);
  });
});

test("formatAddress builds a shipper/consignee block", () => {
  expect(formatAddress(lookupDodaac(db, "FB4486")[0])).toBe(
    "FB4486 65 LRS LGRDDC\nCP 011 351 295 573 365\nLAJES FIELD BLDG T 605\nTERCEIRA ISLAND, 9760 998 PT"
  );
  expect(formatAddress(lookupDodaac(db, "FB2029")[0]).split("\n").pop()).toBe("HILL AFB, UT 84056");
});

test("the DoDAAC page looks a code up from the URL", async () => {
  window.location.hash = "#/dodaac?code=fb2029";
  render(<App />);
  expect(await screen.findByText("FB2029 OO ALC DDHU CNTRL RCV")).toBeInTheDocument();
  expect(screen.getByText("HIF")).toBeInTheDocument();
});

test("the declaration fills the consignee from a DoDAAC", async () => {
  window.location.hash = "#/declaration";
  render(<App />);
  const box = await screen.findByLabelText("Fill consignee from a DoDAAC");
  fireEvent.change(box, { target: { value: "FB4486" } });
  const [first] = await screen.findAllByRole("button", { name: /FB4486/ });
  expect(first).toHaveTextContent(/^FB4486 65 LRS LGRDDC/);
  fireEvent.click(first);
  await waitFor(() =>
    expect(screen.getByLabelText("Consignee (name and address)").value).toMatch(/^FB4486 65 LRS LGRDDC\n.*TERCEIRA ISLAND/s)
  );
});
