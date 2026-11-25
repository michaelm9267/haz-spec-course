import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import DodaacPicker, { useDodaacDb } from "./DodaacPicker";
import { formatAddress, isDodaac, isPlaceholder, lookupDodaac } from "../utils/dodaac";
import "../Styles/declaration.css";

const PORTS = [
  ["apoe", "APOE"],
  ["apod", "APOD"],
  ["spoe", "SPOE"],
  ["spod", "SPOD"],
  ["icao", "ICAO"],
  ["phone", "Phone"],
];

const AddressCard = ({ a, primary }) => {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard?.writeText(formatAddress(a)).then(
      () => setCopied(true),
      () => setCopied(false)
    );
  return (
    <div className={`decl-line dodaac-address${primary ? " primary" : ""}`}>
      <div className="decl-line-head">
        <strong>{a.name || a.dodaac}</strong>
        <span className="decl-muted">
          {a.records} record{a.records === 1 ? "" : "s"} · address type {a.types.join(", ")}
          {a.overseas ? " · overseas" : ""}
        </span>
        <button type="button" className="decl-secondary dodaac-copy" onClick={copy}>
          {copied ? "Copied" : "Copy address"}
        </button>
      </div>
      <pre className="dodaac-block">{formatAddress(a)}</pre>
      {PORTS.some(([k]) => a[k]) && (
        <dl className="dodaac-ports">
          {PORTS.filter(([k]) => a[k]).map(([k, l]) => (
            <div key={k}>
              <dt>{l}</dt>
              <dd>{a[k]}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};

const DodaacLookup = () => {
  const [params, setParams] = useSearchParams();
  const code = (params.get("code") || "").toUpperCase();
  const { db, error, loading } = useDodaacDb(isDodaac(code));
  const addresses = db && isDodaac(code) ? lookupDodaac(db, code) : [];
  const [main, ...others] = addresses;

  return (
    <div className="declaration">
      <h1>DoDAAC lookup</h1>
      <p className="compat-intro">
        Search by DoDAAC, unit or organization name, base or city, or ZIP code. Pick a result to see its
        address, aerial and surface ports, and any other addresses recorded under the same code.
      </p>

      <section className="calc-card">
        <DodaacPicker onPick={(a) => setParams({ code: a.dodaac })} />
      </section>

      {isDodaac(code) && (
        <section className="calc-card" aria-live="polite">
          <h2>{code}</h2>
          {error && <p className="status">{error.message || "Couldn't load the DoDAAC database."}</p>}
          {loading && <p className="status">Loading DoDAAC database…</p>}
          {db && !main && <p className="status">No records for {code}.</p>}
          {main && isPlaceholder(addresses) && (
            <p className="note">
              {code} is a generic or placeholder code: it is recorded for {addresses.length} unrelated addresses.
              Confirm the actual activity before using it on a shipping document.
            </p>
          )}
          {main && <AddressCard a={main} primary />}
          {others.length > 0 && (
            <details className="dodaac-others">
              <summary>
                {others.length} other address{others.length === 1 ? "" : "es"} recorded for {code}
              </summary>
              {others.map((a, i) => (
                <AddressCard key={i} a={a} />
              ))}
            </details>
          )}
        </section>
      )}

      <p className="q-disclaimer">
        Addresses come from the DoDAAC records bundled with HazRef (public/data/DODAACs.sqlite). Verify against
        the DoDAAD before shipping.
      </p>
    </div>
  );
};

export default DodaacLookup;
