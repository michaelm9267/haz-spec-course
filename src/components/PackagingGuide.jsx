import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loadDraft, saveDraft } from "./ShippersDeclaration";
import { useRegulation } from "../regulations/RegulationContext";
import ItemPicker from "./ItemPicker";
import PackageDrawing, { calloutNumbers } from "./PackageDrawing";
import { technicalNameRequired, UNITS } from "../utils/declaration";
import {
  CONTAINERS,
  containerOf,
  containersFor,
  declarationLines,
  defaultContainer,
  isAirMode,
  isCylinderGas,
  modesFor,
  newPackage,
  packagingPlan,
  withPackages,
} from "../utils/packaging";
import { division } from "../utils/quantities";
import "../Styles/calculators.css";
import "../Styles/declaration.css";
import "../Styles/packaging.css";

const STORE = (key) => `hazref.packaging.${key}`;
const PKG_UNITS = Object.keys(UNITS).filter((u) => u !== "kg G");

const load = (key) => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE(key)));
    if (saved && Array.isArray(saved.packages)) return saved;
  } catch {
    // ignore unreadable or blocked storage
  }
  return { mode: "airPax", packages: [] };
};

const Field = ({ label, children, hint, wide }) => (
  <label className={`decl-field${wide ? " wide" : ""}`}>
    <span>{label}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
);

const Cite = ({ children }) =>
  children ? <span className="pkg-cite">{children}</span> : null;

const limitsText = (row) => (row ? `${row.inner} per inner receptacle, ${row.outer} per package` : "");

/** What changes when a package goes as a limited quantity. */
const lqBenefits = (s, regKey) =>
  [
    "no UN-specification packaging needed (a strong outer packaging, 30 kg gross at most)",
    `the limited quantity ${s.air ? "“Y” " : ""}mark instead of the UN specification mark`,
    s.air ? "hazard labels are still required by air" : "no hazard labels",
    regKey === "afman" ? "LTD QTY in the Authorization column of the DAF Form 7507" : "“Limited Quantity” on the shipping paper",
  ].join("; ");

/**
 * Suggests a limited quantity when the entry allows it, from the UN number and the
 * quantities entered (limitedQuantityCheck), or says what would have to change.
 */
const LqSuggestion = ({ s, item, pkg, regKey, onUse }) => {
  const use = (
    <button type="button" className="decl-secondary" onClick={onUse}>
      Use limited quantity
    </button>
  );
  if (s.status === "yes")
    return (
      <div className="pkg-lq-suggest yes" role="status">
        <p>
          <strong>Suggested: ship as a limited quantity.</strong> {item.un} at {s.quantity.text}
          {Number(pkg.inners) > 1 ? ` (${pkg.inners} × ${pkg.innerQty} ${pkg.unit})` : ""} is within the limits ({limitsText(s.row)}).
          As a limited quantity: {lqBenefits(s, regKey)}.
        </p>
        {use}
      </div>
    );
  if (s.status === "check")
    return (
      <div className="pkg-lq-suggest maybe" role="status">
        <p>
          <strong>May qualify as a limited quantity.</strong> {s.card.summary}
          {s.row ? ` Limits: ${limitsText(s.row)}.` : ""}
        </p>
        {use}
      </div>
    );
  if (s.status === "noqty")
    return (
      <p className="pkg-lq-suggest info">
        {item.un} can go as a limited quantity{s.row ? ` (${limitsText(s.row)})` : ""}. Enter the quantity to see if this package
        qualifies.
      </p>
    );
  // "over": the entry allows it, this package doesn't
  return (
    <p className="pkg-lq-suggest info">
      Not a limited quantity as packed: {s.problems.map((p) => p.replace(/ Choose a box.*$/, "")).join(" ")}
      {s.row ? ` To qualify: ${limitsText(s.row)}, in a combination packaging.` : ""}
    </p>
  );
};

const PackageCard = ({ pkg, item, regKey, mode, onChange, onRemove }) => {
  const plan = packagingPlan(item, pkg, { regKey, mode });
  const set = (k) => (e) =>
    onChange({
      ...pkg,
      [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    });
  const num = calloutNumbers(plan);
  const air = regKey === "afman" || isAirMode(mode);
  const gasOk = isCylinderGas(item);
  const container = containerOf(pkg);
  const single = container.kind === "single";
  const options = containersFor(pkg.state);
  const setState = (e) => {
    const state = e.target.value;
    const keep = CONTAINERS[pkg.container]?.states.includes(state);
    onChange({
      ...pkg,
      state,
      container: keep ? pkg.container : defaultContainer(state),
      unit: state === "liquid" ? "L" : "kg",
    });
  };

  return (
    <section
      className="calc-card pkg-card"
      aria-label={`${item.un} ${item.name}`}
    >
      <div className="pkg-head">
        <h2>
          <span className="cls">{item.hazardClass}</span> {item.un} {item.name}
          {item.pg && <span className="pkg-pg"> PG {item.pg}</span>}
        </h2>
        <div className="pkg-head-actions">
          <Link to={`/${regKey}/item/${item.id}`}>Table entry</Link>
          <button type="button" className="decl-secondary" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>

      <div className="decl-fields pkg-fields">
        <Field label="Physical state">
          <select value={pkg.state} onChange={setState}>
            <option value="liquid">Liquid</option>
            <option value="solid">Solid</option>
            {gasOk && <option value="gas">Gas (cylinder)</option>}
          </select>
        </Field>
        {pkg.state !== "gas" && (
          <Field
            label="Container"
            hint={
              single
                ? "Single packaging: the material goes straight in."
                : "Combination packaging: inner receptacles inside this outer packaging."
            }
          >
            <select
              value={
                container === CONTAINERS[pkg.container]
                  ? pkg.container
                  : defaultContainer(pkg.state)
              }
              onChange={set("container")}
            >
              {[
                [
                  "combination",
                  "Combination (inner receptacles in an outer packaging)",
                ],
                ["single", "Single packaging"],
              ].map(([kind, label]) => (
                <optgroup key={kind} label={label}>
                  {options
                    .filter((k) => CONTAINERS[k].kind === kind)
                    .map((k) => (
                      <option key={k} value={k}>
                        {CONTAINERS[k].name} ({CONTAINERS[k].code})
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </Field>
        )}
        <>
          <Field
            label={
              single
                ? `Quantity in the ${container.shape}`
                : "Quantity per inner receptacle"
            }
          >
            <div className="pkg-qty">
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={pkg.innerQty}
                onChange={set("innerQty")}
              />
              <select value={pkg.unit} onChange={set("unit")} aria-label="Unit">
                {PKG_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {UNITS[u].label}
                  </option>
                ))}
              </select>
            </div>
          </Field>
          {!single && (
            <Field label={`Inner receptacles in the ${container.shape}`}>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={pkg.inners}
                onChange={set("inners")}
              />
            </Field>
          )}
        </>
        <Field
          label="Number of packages like this"
          hint="Goes on the declaration."
        >
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={pkg.count ?? "1"}
            onChange={set("count")}
          />
        </Field>
        {division(item.hazardClass)?.[0] === "1" && (
          <Field label="Net explosive weight (kg per package)">
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={pkg.netExplosive ?? ""}
              onChange={set("netExplosive")}
            />
          </Field>
        )}
        {technicalNameRequired(item, regKey) && (
          <Field label="Technical name" hint="Required for this entry.">
            <input value={pkg.technicalName} onChange={set("technicalName")} />
          </Field>
        )}
        <label className="decl-checkbox">
          <input
            type="checkbox"
            checked={pkg.limitedQuantity}
            onChange={set("limitedQuantity")}
          />{" "}
          Ship as a limited quantity
        </label>
        <label className="decl-checkbox">
          <input type="checkbox" checked={pkg.rq} onChange={set("rq")} />{" "}
          Reportable quantity (RQ)
        </label>
      </div>

      {plan.blocked ? (
        <p className="pkg-blocked" role="alert">
          {plan.blocked}
        </p>
      ) : (
        <>
          {plan.warnings.length > 0 && (
            <ul className="pkg-warnings" role="alert">
              {plan.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          {plan.lqSuggestion && (
            <LqSuggestion
              s={plan.lqSuggestion}
              item={item}
              pkg={pkg}
              regKey={regKey}
              onUse={() => onChange({ ...pkg, limitedQuantity: true, container: single ? "4G" : pkg.container })}
            />
          )}
          <div className="pkg-body">
            <figure className="pkg-figure">
              <PackageDrawing plan={plan} item={item} air={air} />
              <figcaption>
                {plan.shape === "cylinder"
                  ? "Cylinder: labels on the shoulder, shipping name and address on the body."
                  : plan.shape === "box"
                    ? `${container.name} (${container.code}), front and right side${plan.marks.some((m) => m.key === "arrows") ? " (orientation arrows go on the opposite side too)" : ""}.`
                    : `${container.name} (${container.code}): markings and labels on the side${plan.marks.some((m) => m.key === "arrows") ? ", orientation arrows on two opposite sides" : ""}.`}{" "}
                Numbers match the lists. Illustration only — not to scale.
              </figcaption>
            </figure>
            <div className="pkg-lists">
              <h3>Packaging</h3>
              <ul>
                {plan.packaging.map((p) => (
                  <li key={p.text}>
                    {p.text} <Cite>{p.cite}</Cite>
                  </li>
                ))}
              </ul>
              <h3>Marking</h3>
              <ol className="pkg-numbered">
                {plan.marks.map((m) => (
                  <li key={m.key} value={num[m.key]}>
                    <strong>{m.text}</strong>
                    <br />
                    {m.detail} <Cite>{m.cite}</Cite>
                  </li>
                ))}
              </ol>
              <h3>Labels</h3>
              {plan.labels.length ? (
                <ol className="pkg-numbered">
                  {plan.labels.map((l) => (
                    <li key={l.key} value={num[l.key]}>
                      <strong>{l.text}</strong> <Cite>{l.cite}</Cite>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="pkg-none">No hazard labels.</p>
              )}
              {plan.lq?.applies && plan.lq.rows.length > 0 && (
                <>
                  <h3>Limited quantity limits</h3>
                  <table className="pkg-lq">
                    <thead>
                      <tr>
                        <th />
                        <th>Inner</th>
                        <th>Package</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.lq.rows.map((r) => (
                        <tr key={r.label}>
                          <td>{r.label}</td>
                          <td>{r.inner}</td>
                          <td>{r.outer}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Cite>{plan.lq.cite}</Cite>
                </>
              )}
              {plan.notes.length > 0 && (
                <>
                  <h3>Also check</h3>
                  <ul className="pkg-notes">
                    {plan.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
};

/** Sends the packages to the Shipper's Declaration page, filled in. */
const ToDeclaration = ({ packages, items, regKey, mode }) => {
  const navigate = useNavigate();
  const existing = loadDraft(regKey);
  const { lines, skipped } = declarationLines(packages, items, {
    regKey,
    mode,
  });
  const afman = regKey === "afman";
  const go = (replace) => {
    const { decl } = withPackages(existing, packages, items, {
      regKey,
      mode,
      replace,
    });
    saveDraft(regKey, decl);
    navigate("/declaration?from=packaging");
  };
  const what = afman ? "DAF Form 7507" : "shipping paper";
  return (
    <section className="calc-card pkg-todecl" aria-label={`Create the ${what}`}>
      <h2>
        {afman ? "Shipper's Declaration (DAF Form 7507)" : "Shipping paper"}
      </h2>
      <p className="calc-intro">
        Puts{" "}
        {lines.length === 1 ? "this package" : `these ${lines.length} packages`}{" "}
        on the {what}: shipping name, ID number, class, packing group, number
        and type of packages, quantity,{" "}
        {afman
          ? "packing paragraph, NEW, RQ and LTD QTY"
          : "packaging section, RQ and limited quantity"}
        , the {afman ? "aircraft" : "mode"}, and the ERG emergency information
        and phone number. Shipper, consignee and anything else you've already
        entered there is kept.
      </p>
      {skipped.length > 0 && (
        <p className="pkg-none">
          Left out:{" "}
          {skipped
            .map((s) => `${s.item.un} (${s.reason.split(/[.:]/)[0]})`)
            .join("; ")}
          .
        </p>
      )}
      <div className="pkg-todecl-actions">
        {existing.lines.length > 0 ? (
          <>
            <button
              type="button"
              className="decl-secondary decl-primary"
              disabled={!lines.length}
              onClick={() => go(true)}
            >
              Create {what} (replace the {existing.lines.length} material
              {existing.lines.length === 1 ? "" : "s"} on it)
            </button>
            <button
              type="button"
              className="decl-secondary"
              disabled={!lines.length}
              onClick={() => go(false)}
            >
              Add to the {existing.lines.length} already on it
            </button>
          </>
        ) : (
          <button
            type="button"
            className="decl-secondary decl-primary"
            disabled={!lines.length}
            onClick={() => go(true)}
          >
            Create {what}
          </button>
        )}
      </div>
    </section>
  );
};

// Remounted per regulation (see the default export), so each keeps its own list.
const Guide = () => {
  const { key, config, data } = useRegulation();
  const [state, setState] = useState(() => load(key));
  const modes = modesFor(key);
  const mode = modes[state.mode] ? state.mode : Object.keys(modes)[0];

  useEffect(() => {
    try {
      localStorage.setItem(STORE(key), JSON.stringify(state));
    } catch {
      // storage unavailable: the list just isn't remembered
    }
  }, [key, state]);

  if (!data) return <p className="status">Loading {config.name}…</p>;

  const packages = state.packages.filter((p) => data.items[p.id]);
  const update = (packages) => setState({ ...state, packages });

  return (
    <div className="declaration packaging">
      <h1>Packaging guide</h1>
      <p className="compat-intro">
        Add what you're shipping and how it's packed. For each package HazRef
        suggests the packaging, markings and labels from {config.name}, and
        draws where they go. It's a study aid: confirm against the packing{" "}
        {key === "afman" ? "paragraph" : "section"} and the regulation before
        you ship.
      </p>

      <section className="calc-card">
        <div className="decl-fields">
          <Field label={key === "afman" ? "Aircraft" : "Mode of transport"}>
            <select
              value={mode}
              onChange={(e) => setState({ ...state, mode: e.target.value })}
            >
              {Object.entries(modes).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <div className="decl-field wide">
            <span>Add a material</span>
            <ItemPicker
              items={data.items}
              label="Add a material to package"
              placeholder="UN number or shipping name"
              onAdd={(item) => update([...packages, newPackage(item)])}
            />
          </div>
        </div>
      </section>

      {packages.length === 0 && (
        <p className="status">
          Add a material to see how its package should look.
        </p>
      )}

      {packages.map((pkg, i) => (
        <PackageCard
          key={i}
          pkg={pkg}
          item={data.items[pkg.id]}
          regKey={key}
          mode={mode}
          onChange={(p) => update(packages.map((q, j) => (j === i ? p : q)))}
          onRemove={() => update(packages.filter((_, j) => j !== i))}
        />
      ))}

      {packages.length > 0 && (
        <ToDeclaration
          packages={packages}
          items={data.items}
          regKey={key}
          mode={mode}
        />
      )}
    </div>
  );
};

const PackagingGuide = () => {
  const { key } = useRegulation();
  return <Guide key={key} />;
};

export default PackagingGuide;
