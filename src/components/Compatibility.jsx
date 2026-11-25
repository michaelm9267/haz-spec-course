import React, { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { loadRegulation, useRegulation } from "../regulations/RegulationContext";
import { findEquivalent } from "../utils/hazard";
import ItemPicker, { itemLabel } from "./ItemPicker";
import { LEVELS, MODES, checkLoad } from "../utils/compatibility";
import "../Styles/compatibility.css";

// The load lives in the URL: ?reg=afman&mode=afman2&items=12,40e,77f  (e = excepted qty, f = fissile)
const parseItems = (s) =>
  (s || "")
    .split(",")
    .map((t) => /^(\d+)([ef]*)$/.exec(t))
    .filter(Boolean)
    .map(([, id, flags]) => ({ id: Number(id), eq: flags.includes("e"), fissile: flags.includes("f") }));
const formatItems = (entries) => entries.map((e) => `${e.id}${e.eq ? "e" : ""}${e.fissile ? "f" : ""}`).join(",");

const defaultMode = (reg) => Object.keys(MODES).find((m) => MODES[m].regulation === reg);

const LevelBadge = ({ level, long }) => (
  <span className={`compat-badge lvl-${level}`} title={LEVELS[level].label}>
    {long ? LEVELS[level].label : LEVELS[level].short}
  </span>
);

const Compatibility = () => {
  const { key, config, data } = useRegulation();
  const [params, setParams] = useSearchParams();
  const reg = params.get("reg") || key;
  const mode = MODES[params.get("mode")]?.regulation === key ? params.get("mode") : defaultMode(key);
  const stored = useMemo(() => parseItems(params.get("items")), [params]);

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  // When the regulation is switched in the header, carry the load across to the equivalent entries.
  useEffect(() => {
    if (!data || reg === key || !stored.length) return;
    let active = true;
    loadRegulation(reg).then((old) => {
      if (!active) return;
      const mapped = stored
        .map((e) => {
          const match = old.items[e.id] && findEquivalent(old.items[e.id], data.items);
          return match && { ...e, id: match.id };
        })
        .filter(Boolean);
      update({ reg: key, mode: defaultMode(key), items: formatItems(mapped) });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, reg, key]);

  if (!data) return <p className="status">Loading {config.name}…</p>;

  const entries = reg === key ? stored.filter((e) => data.items[e.id]).map((e) => ({ ...e, key: e.id, item: data.items[e.id] })) : [];
  const setEntries = (list) => update({ reg: key, mode, items: formatItems(list) });
  const toggle = (idx, flag) => setEntries(entries.map((e, i) => (i === idx ? { ...e, [flag]: !e[flag] } : e)));

  const { pairs, worst } = checkLoad(entries, mode);
  const sorted = [...pairs].sort((p, q) => LEVELS[q.level].rank - LEVELS[p.level].rank);
  const pairOf = (i, j) => pairs.find((p) => (p.a === entries[i] && p.b === entries[j]) || (p.a === entries[j] && p.b === entries[i]));
  const isAfman = key === "afman";

  return (
    <div className="compatibility">
      <h1>Load compatibility</h1>
      <p className="compat-intro">
        Build a load from the {config.name} table and check every pair of items against the segregation
        rules. Use the regulation switch in the header to work from {isAfman ? "49 CFR" : "AFMAN 24-604"} instead.
      </p>

      <div className="compat-modes" role="radiogroup" aria-label="Rule set">
        {Object.entries(MODES)
          .filter(([, m]) => m.regulation === key)
          .map(([m, def]) => (
            <button key={m} role="radio" aria-checked={m === mode} className={m === mode ? "active" : undefined} onClick={() => update({ reg: key, mode: m })}>
              {def.label}
            </button>
          ))}
      </div>
      {mode === "afman3" && (
        <p className="note">
          Chapter 3 (tactical, contingency or exercise) operations may deviate from Tables A18.1 and A18.2:
          incompatible items may share an aircraft when separated to the maximum extent possible, without a
          compatibility waiver. The five A18.4 restrictions below still always apply.
        </p>
      )}

      <section className="calc-card">
        <h2>Load ({entries.length})</h2>
        <ItemPicker items={data.items} onAdd={(i) => setEntries([...entries, { id: i.id }])} />
        {entries.length === 0 ? (
          <p className="compat-empty">Add two or more items to check them against each other.</p>
        ) : (
          <ol className="compat-load">
            {entries.map((e, idx) => (
              <li key={idx}>
                <span className="cls">{e.item.hazardClass}</span>
                <Link to={`/${key}/item/${e.id}`}>{itemLabel(e.item)}</Link>
                <span className="opts">
                  {isAfman && (
                    <label>
                      <input type="checkbox" checked={e.eq} onChange={() => toggle(idx, "eq")} /> Excepted qty
                    </label>
                  )}
                  {isAfman && e.item.hazardClass.startsWith("7") && (
                    <label>
                      <input type="checkbox" checked={e.fissile} onChange={() => toggle(idx, "fissile")} /> Fissile Class III
                    </label>
                  )}
                  <button className="remove" aria-label={`Remove ${e.item.name}`} onClick={() => setEntries(entries.filter((_, i) => i !== idx))}>
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {entries.length >= 2 && (
        <>
          <div className={`compat-verdict lvl-${worst}`} role="status">
            <strong>{worst === "ok" ? "Compatible" : LEVELS[worst].label}</strong>
            <span>
              {worst === "ok"
                ? "No pair in this load is restricted."
                : `${pairs.filter((p) => p.level === worst).length} of ${pairs.length} pairs — see details below.`}
            </span>
          </div>

          <div className="compat-matrix-wrap">
            <table className="compat-matrix">
              <thead>
                <tr>
                  <th />
                  {entries.map((e, j) => (
                    <th key={j} scope="col" title={e.item.name}>
                      {j + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={i}>
                    <th scope="row" title={e.item.name}>
                      {i + 1}. {e.item.un || e.item.name.slice(0, 12)} <span className="cls">{e.item.hazardClass}</span>
                    </th>
                    {entries.map((_, j) => (
                      <td key={j}>{i === j ? <span className="diag">—</span> : <LevelBadge level={pairOf(i, j).level} />}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="compat-pairs">
            <h2>Pair details</h2>
            {sorted.map((p, n) => (
              <div key={n} className={`compat-pair lvl-${p.level}`}>
                <div className="compat-pair-head">
                  <LevelBadge level={p.level} long />
                  <span>
                    {itemLabel(p.a.item)} <em>+</em> {itemLabel(p.b.item)}
                  </span>
                </div>
                <ul>
                  {p.reasons.map((r, k) => (
                    <li key={k}>
                      {r.text} <cite>{r.cite}</cite>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <dl className="compat-legend">
            {Object.entries(LEVELS).map(([l, def]) => (
              <div key={l}>
                <dt>
                  <LevelBadge level={l} />
                </dt>
                <dd>{def.label}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      <p className="q-disclaimer">
        Worked out from each entry's class, compatibility group, packing group, special provisions and name.
        Physical state (liquid/solid) and items like cyanides are inferred from the shipping name, so confirm
        them and the cited paragraphs before loading.
      </p>
    </div>
  );
};

export default Compatibility;
