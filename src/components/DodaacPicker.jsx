import React, { useEffect, useState } from "react";
import { loadDodaacDb, searchDodaacs } from "../utils/dodaac";
import "../Styles/compatibility.css";

/**
 * Opens the DoDAAC database the first time `active` is true. The 6 MB file is
 * downloaded on demand, so pages that never use a lookup don't pay for it.
 */
export function useDodaacDb(active = true) {
  const [state, setState] = useState({ db: null, error: null, loading: false });
  useEffect(() => {
    if (!active || state.db) return;
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    loadDodaacDb()
      .then((db) => live && setState({ db, error: null, loading: false }))
      .catch((error) => live && setState({ db: null, error, loading: false }));
    return () => {
      live = false;
    };
  }, [active, state.db]);
  return state;
}

/** Organization name without the leading code many records repeat ("FB4486 65 LRS" → "65 LRS"). */
export const dodaacLabel = (a) => (a.name.toUpperCase().startsWith(a.dodaac) ? a.name.slice(a.dodaac.length).trim() : a.name) || a.dodaac;

/** Search box over the DoDAAC database. Calls onPick with the chosen address. */
const DodaacPicker = ({ onPick, label = "Look up a DoDAAC", placeholder = "DoDAAC, unit name, base or ZIP" }) => {
  const [q, setQ] = useState("");
  const { db, error, loading } = useDodaacDb(q.trim().length > 0);
  const results = db ? searchDodaacs(db, q, 12) : [];

  return (
    <div className="compat-picker dodaac-picker">
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={label} />
      {q.trim() && (
        <ul className="compat-results">
          {error && <li className="empty">{error.message || "Couldn't load the DoDAAC database."}</li>}
          {!error && loading && <li className="empty">Loading DoDAAC database…</li>}
          {db && q.trim().length < 2 && <li className="empty">Keep typing…</li>}
          {db && q.trim().length >= 2 && results.length === 0 && <li className="empty">No matching DoDAACs</li>}
          {results.map((a) => (
            <li key={a.dodaac}>
              <button
                type="button"
                onClick={() => {
                  onPick(a);
                  setQ("");
                }}
              >
                <span className="cls">{a.dodaac}</span> {dodaacLabel(a)} — {[a.city, a.state || a.country].filter(Boolean).join(", ")}
                {a.placeholder && <em className="dodaac-flag"> generic code</em>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DodaacPicker;
