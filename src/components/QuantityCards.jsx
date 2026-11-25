import React from "react";

const STATUS = {
  permitted: { label: "Permitted", className: "q-permitted" },
  "not-permitted": { label: "Not permitted", className: "q-denied" },
  check: { label: "Conditions apply", className: "q-check" },
};

const QuantityCard = ({ card }) => {
  const status = STATUS[card.status];
  return (
    <div className={`q-card ${status.className}`}>
      <div className="q-card-head">
        <h3>{card.title}</h3>
        <span className="q-status">{status.label}</span>
      </div>
      <p className="q-summary">{card.summary}</p>
      {card.rows.length > 0 && (
        <table className="q-table">
          <thead>
            <tr>
              <th />
              <th>Inner packaging</th>
              <th>Per package</th>
            </tr>
          </thead>
          <tbody>
            {card.rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td>{r.inner}</td>
                <td>{r.outer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {card.status !== "not-permitted" && card.notes.length > 0 && (
        <ul className="q-notes">
          {card.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      <div className="q-cite">{card.cite}</div>
    </div>
  );
};

const QuantityCards = ({ cards }) => (
  <section>
    <h2>Excepted &amp; limited quantities</h2>
    <div className="q-cards">
      {cards.map((c) => (
        <QuantityCard key={c.title} card={c} />
      ))}
    </div>
    <p className="q-disclaimer">
      Worked out from this entry's class, packing group, subsidiary hazards and special provisions. Confirm the
      material's physical state and the full requirements in the cited paragraph before shipping.
    </p>
  </section>
);

export default QuantityCards;
