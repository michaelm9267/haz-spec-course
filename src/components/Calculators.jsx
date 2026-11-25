import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useRegulation } from "../regulations/RegulationContext";
import { CYLINDERS, GAS_DATA, PRESSURE_UNITS, VOLUME_UNITS, cylinderContents, fToC, gasState } from "../utils/gas";
import "../Styles/calculators.css";

const fmt = (n, digits = 1) =>
  n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });

const Select = ({ value, onChange, options, label }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
    {Object.entries(options).map(([key, o]) => (
      <option key={key} value={key}>
        {o.label}
      </option>
    ))}
  </select>
);

const STATE_NOTES = {
  liquefied:
    "This is a liquefied gas. Cylinders of liquefied gas are filled by weight, not pressure, so the pressure-based estimate below does not give the contents. Use the net weight stamped on the cylinder or the shipping papers.",
  refrigerated:
    "This is a refrigerated (cryogenic) liquid. It is not shipped in a high-pressure cylinder, so this calculator does not apply.",
  dissolved:
    "This gas is dissolved or adsorbed in the cylinder (for example acetylene in acetone), so the pressure-based estimate does not give the contents. Use the net weight.",
  article:
    "This entry is an article (an aerosol, cartridge or similar), not a gas cylinder, so this calculator does not apply.",
};

const MAX_RESULTS = 10;

const searchGases = (items, raw) => {
  const q = raw.toLowerCase().trim();
  if (!q) return [];
  const starts = [];
  const contains = [];
  for (const i of items) {
    if (!i.hazardClass.startsWith("2") || !i.un) continue;
    const un = i.un.toLowerCase();
    const n = i.name.toLowerCase();
    if (un.startsWith(q) || un.replace(/^(un|na|id)/, "").startsWith(q) || n.startsWith(q)) starts.push(i);
    else if (un.includes(q) || n.includes(q)) contains.push(i);
  }
  return [...starts, ...contains].slice(0, MAX_RESULTS);
};

/** Pick a Class 2 entry by UN number or name from the active regulation's table. */
const GasPicker = ({ items, onSelect }) => {
  const [q, setQ] = useState("");
  const results = useMemo(() => searchGases(items, q), [items, q]);
  return (
    <div className="gas-picker">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search Class 2 gases by UN number or name (e.g. 1066, nitrogen)"
        aria-label="UN number"
      />
      {q.trim() && (
        <ul className="gas-results">
          {results.length === 0 && <li className="empty">No Class 2 entries match</li>}
          {results.map((i) => (
            <li key={i.id}>
              <button
                onClick={() => {
                  onSelect(i);
                  setQ("");
                }}
              >
                <strong>{i.un}</strong> {i.name} <span className="gas-class">{i.hazardClass}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const parseKg = (s) => {
  const m = /^([\d.]+)\s*kg/i.exec(s || "");
  return m ? parseFloat(m[1]) : null;
};

/** Regulation details for the selected entry, with the computed gas mass compared to any kg limit. */
const ItemLimits = ({ regKey, item, massKg }) => {
  const rows =
    regKey === "cfr"
      ? [
          ["Passenger aircraft/rail", item.raw.qtyPassenger],
          ["Cargo aircraft only", item.raw.qtyCargo],
        ]
      : [];
  return (
    <div className="gas-limits">
      {item.forbidden && <span className="badge badge-danger">Forbidden</span>}
      {item.airForbidden && <span className="badge badge-danger">Forbidden on aircraft</span>}
      {item.cargoOnly && <span className="badge badge-warning">Cargo aircraft only</span>}
      {rows.length > 0 && (
        <table className="q-table">
          <thead>
            <tr>
              <th />
              <th>Limit per package</th>
              {massKg !== null && <th>This cylinder's gas</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, value]) => {
              const limit = parseKg(value);
              return (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td>{value || "—"}</td>
                  {massKg !== null && (
                    <td>{limit ? `${Math.round((massKg / limit) * 100)}% of ${limit} kg` : "—"}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

const DEFAULT_CYLINDER = CYLINDERS.find((c) => c.id === "k200");
const CYLINDER_GROUPS = [...new Set(CYLINDERS.map((c) => c.group))];

const CylinderSelect = ({ value, onChange }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Cylinder type">
    <option value="custom">Custom / enter my own</option>
    {CYLINDER_GROUPS.map((g) => (
      <optgroup key={g} label={g}>
        {CYLINDERS.filter((c) => c.group === g).map((c) => (
          <option key={c.id} value={c.id}>
            {c.label} — {c.spec}
          </option>
        ))}
      </optgroup>
    ))}
  </select>
);

const CylinderCalculator = () => {
  const { key: regKey, config, data } = useRegulation();
  const [params, setParams] = useSearchParams();
  const selectedUn = params.get("un");
  const selected = useMemo(
    () => data?.items.find((i) => i.un === selectedUn && i.hazardClass.startsWith("2")),
    [data, selectedUn]
  );
  const known = selectedUn ? GAS_DATA[selectedUn] : undefined;
  const state = selected ? gasState(selected) : undefined;

  const [waterCapacity, setWaterCapacity] = useState(String(DEFAULT_CYLINDER.wc));
  const [volumeUnit, setVolumeUnit] = useState("L");
  const [pressure, setPressure] = useState(String(DEFAULT_CYLINDER.fill));
  const [pressureUnit, setPressureUnit] = useState("psig");
  const [temp, setTemp] = useState("70");
  const [tempUnit, setTempUnit] = useState("F");
  const [cylinderId, setCylinderId] = useState(DEFAULT_CYLINDER.id);
  const cylinder = CYLINDERS.find((c) => c.id === cylinderId);
  const [customMolarMass, setCustomMolarMass] = useState("");
  const [z, setZ] = useState("1");

  const chooseCylinder = (id) => {
    setCylinderId(id);
    const c = CYLINDERS.find((x) => x.id === id);
    if (!c) return;
    setWaterCapacity(String(c.wc));
    setVolumeUnit(c.unit);
    setPressure(String(c.fill));
    setPressureUnit("psig");
  };
  // Editing a field the preset filled in turns it into a custom cylinder.
  const edit = (setter) => (value) => {
    setter(value);
    setCylinderId("custom");
  };
  const netKg = cylinder?.netLb ? cylinder.netLb * 0.45359237 : null;

  const molarMass = known ? known.molarMass : parseFloat(customMolarMass);
  const selectUn = (un) => {
    const next = new URLSearchParams(params);
    if (un) next.set("un", un);
    else next.delete("un");
    setParams(next, { replace: true });
    setCustomMolarMass("");
  };

  const result = useMemo(() => {
    const t = parseFloat(temp);
    return cylinderContents({
      waterCapacity: parseFloat(waterCapacity),
      volumeUnit,
      pressure: parseFloat(pressure),
      pressureUnit,
      tempC: tempUnit === "F" ? fToC(t) : t,
      z: parseFloat(z),
      molarMass,
    });
  }, [waterCapacity, volumeUnit, pressure, pressureUnit, temp, tempUnit, z, molarMass]);

  return (
    <section className="calc-card">
      <h2>Compressed gas cylinder contents</h2>
      <p className="calc-intro">
        Pick the gas by its UN number, then enter the cylinder's water capacity and fill pressure to estimate
        how much gas it holds. The water capacity (WC) is usually stamped on the cylinder shoulder.
      </p>

      <div className="gas-select">
        <span className="gas-select-label">Gas (UN number)</span>
        {selectedUn && !data && <p className="calc-intro">Loading {config.name}…</p>}
        {selectedUn && data && !selected && (
          <p className="note">{selectedUn} isn't a Class 2 entry in {config.name}. Pick another gas.</p>
        )}
        {selected ? (
          <div className="gas-selected">
            <div className="gas-selected-head">
              <div>
                <Link to={`/${regKey}/item/${selected.id}`}>
                  <strong>{selected.un}</strong> {selected.name}
                </Link>
                <span className="gas-class">Class {selected.hazardClass}</span>
              </div>
              <button className="gas-clear" onClick={() => selectUn(null)}>
                Change
              </button>
            </div>
            {STATE_NOTES[state] && <p className="note">{STATE_NOTES[state]}</p>}
            <ItemLimits regKey={regKey} item={selected} massKg={netKg ?? (state === "compressed" || !state ? result?.massKg ?? null : null)} />
          </div>
        ) : (
          data && <GasPicker items={data.items} onSelect={(i) => selectUn(i.un)} />
        )}
      </div>

      <div className="calc-field cylinder-field">
        <span>Cylinder type</span>
        <CylinderSelect value={cylinderId} onChange={chooseCylinder} />
        {cylinder ? (
          <small>
            {cylinder.spec} · full at {cylinder.fill.toLocaleString()} psig
            {cylinder.plus && " (\"+\" marked: 10% over the service pressure)"}
            {cylinder.rated && ` · rated ${cylinder.rated}`}
            {cylinder.netLb && ` · ${cylinder.netLb} lb net contents`}. Typical values; check the water
            capacity and service pressure stamped on the cylinder.
          </small>
        ) : (
          <small>Enter the water capacity and fill pressure from the cylinder.</small>
        )}
      </div>

      <div className="calc-grid">
        <label className="calc-field">
          <span>Water capacity</span>
          <div className="calc-input-row">
            <input type="number" min="0" step="any" value={waterCapacity} onChange={(e) => edit(setWaterCapacity)(e.target.value)} />
            <Select value={volumeUnit} onChange={edit(setVolumeUnit)} options={VOLUME_UNITS} label="Water capacity unit" />
          </div>
        </label>

        <label className="calc-field">
          <span>Fill pressure (gauge)</span>
          <div className="calc-input-row">
            <input type="number" min="0" step="any" value={pressure} onChange={(e) => edit(setPressure)(e.target.value)} />
            <Select value={pressureUnit} onChange={edit(setPressureUnit)} options={PRESSURE_UNITS} label="Pressure unit" />
          </div>
        </label>

        <label className="calc-field">
          <span>Gas temperature</span>
          <div className="calc-input-row">
            <input type="number" step="any" value={temp} onChange={(e) => setTemp(e.target.value)} />
            <select value={tempUnit} onChange={(e) => setTempUnit(e.target.value)} aria-label="Temperature unit">
              <option value="F">°F</option>
              <option value="C">°C</option>
            </select>
          </div>
        </label>

        {known ? (
          <div className="calc-field">
            <span>Molar mass</span>
            <div className="calc-static">{known.molarMass} g/mol</div>
            <small>{known.name}</small>
          </div>
        ) : (
          <label className="calc-field">
            <span>Molar mass (g/mol)</span>
            <input
              type="number"
              min="0"
              step="any"
              value={customMolarMass}
              onChange={(e) => setCustomMolarMass(e.target.value)}
              placeholder="Optional"
            />
            <small>
              {selected
                ? "Not on file for this entry (e.g. a mixture or n.o.s.). Enter it to estimate the mass."
                : "Pick a gas above, or enter a molar mass to estimate the mass."}
            </small>
          </label>
        )}

        <label className="calc-field">
          <span>Compressibility factor Z</span>
          <input type="number" min="0.1" step="0.01" value={z} onChange={(e) => setZ(e.target.value)} />
          <small>Leave at 1 for an ideal-gas estimate.</small>
        </label>
      </div>

      {result ? (
        <div className="calc-results" aria-live="polite">
          {netKg === null && (
            <div className="calc-result">
              <div className="calc-result-label">Free gas volume (at 1 atm)</div>
              <div className="calc-result-value">{fmt(result.freeGasL, 0)} L</div>
              <div className="calc-result-sub">{fmt(result.freeGasFt3, 1)} ft³</div>
            </div>
          )}
          {netKg !== null && (
            <div className="calc-result">
              <div className="calc-result-label">Nominal net contents (by weight)</div>
              <div className="calc-result-value">{fmt(cylinder.netLb, 1)} lb</div>
              <div className="calc-result-sub">{fmt(netKg, 2)} kg</div>
            </div>
          )}
          {result.massKg !== null && netKg === null && (
            <div className="calc-result">
              <div className="calc-result-label">Gas mass</div>
              <div className="calc-result-value">{fmt(result.massKg, 2)} kg</div>
              <div className="calc-result-sub">{fmt(result.massLb, 2)} lb</div>
            </div>
          )}
          <div className="calc-result">
            <div className="calc-result-label">Water capacity</div>
            <div className="calc-result-value">{fmt(result.waterCapacityL, 2)} L</div>
            <div className="calc-result-sub">Absolute pressure {fmt(result.absPressurePsia, 1)} psia</div>
          </div>
        </div>
      ) : (
        <p className="note">Enter a water capacity and pressure greater than zero.</p>
      )}

      <details className="calc-method">
        <summary>How this is calculated</summary>
        <ul>
          <li>Absolute pressure = gauge pressure + 14.7 psi (1 atm).</li>
          <li>Free gas volume = water capacity × absolute pressure ÷ 1 atm ÷ Z.</li>
          <li>Gas mass = P × V × molar mass ÷ (Z × R × T), using the ideal gas law.</li>
        </ul>
        <p>
          This is an estimate. Real gases at high pressure deviate from the ideal gas law (for example,
          hydrogen and helium hold noticeably less than shown); enter a compressibility factor Z from the
          gas supplier's data for a closer figure. It does not
          apply to liquefied gases (such as carbon dioxide, propane or ammonia), whose contents are
          determined by net weight. Always confirm quantities against the shipping papers and the
          applicable regulation.
        </p>
      </details>
    </section>
  );
};

const Calculators = () => (
  <div className="calculators">
    <h1>Calculators</h1>
    <CylinderCalculator />
  </div>
);

export default Calculators;
