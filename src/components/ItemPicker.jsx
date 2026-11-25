import React, { useMemo, useState } from "react";
import { searchItems } from "../utils/hazard";
import "../Styles/compatibility.css";

export const itemLabel = (i) => `${i.un || "—"} ${i.name}${i.pg ? ` (PG ${i.pg})` : ""}`;

/** Search box that lists matching table entries and hands the chosen one to onAdd. */
const ItemPicker = ({ items, onAdd, placeholder = "Add an item by UN number or shipping name", label = "Add an item" }) => {
  const [q, setQ] = useState("");
  const results = useMemo(() => searchItems(items, q), [items, q]);
  return (
    <div className="compat-picker">
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={label} />
      {q.trim() && (
        <ul className="compat-results">
          {results.length === 0 && <li className="empty">No matching entries</li>}
          {results.map((i) => (
            <li key={i.id}>
              <button
                onClick={() => {
                  onAdd(i);
                  setQ("");
                }}
              >
                <span className="cls">{i.hazardClass}</span>
                {itemLabel(i)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ItemPicker;
