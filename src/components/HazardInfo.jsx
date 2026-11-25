import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ClassCard from "./ClassCard";
import QuantityCards from "./QuantityCards";
import { useRegulation } from "../regulations/RegulationContext";
import { assetUrl } from "../utils/hazard";
import "../Styles/hazardInfo.css";

const Field = ({ label, children, wide }) => (
  <div className={`field${wide ? " wide" : ""}`}>
    <dt>{label}</dt>
    <dd>{children}</dd>
  </div>
);

const HazardInfo = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { key, config, data } = useRegulation();
  const item = data.items[Number(id)];

  if (!item) {
    return (
      <div className="hazard-info">
        <p>That item could not be found.</p>
        <Link to={`/${key}`}>Back to the {config.tabs.items}</Link>
      </div>
    );
  }

  const symbols = Object.entries(config.symbols).filter(([s]) => (item.symbols || "").includes(s));
  const isCrossReference = !item.un && !item.hazardClass && /\bsee\b/i.test(item.name);
  const { ExtraSections } = config;

  return (
    <article className="hazard-info">
      <div className="hazard-topbar">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <span className="reg-tag">{config.name}</span>
        {item.hazardClass.startsWith("2") && item.un && (
          <Link className="compat-link" to={`/calculators?un=${item.un}`}>
            Cylinder calculator →
          </Link>
        )}
        {item.hazardClass && (
          <Link className="compat-link" to={`/compatibility?reg=${key}&items=${item.id}`}>
            Check load compatibility →
          </Link>
        )}
      </div>

      <header className="hazard-title">
        <div className="un-number">{item.un || "No UN/ID number"}</div>
        <h1>{item.name}</h1>
        {item.forbidden && <div className="badge badge-danger">{config.forbiddenLabel}</div>}
        {item.airForbidden && <div className="badge badge-danger">Forbidden on aircraft</div>}
        {item.cargoOnly && <div className="badge badge-warning">Cargo aircraft only</div>}
      </header>

      {isCrossReference ? (
        <p className="note">
          This entry is a cross-reference. Search for the proper shipping name it points to for shipping
          details.
        </p>
      ) : (
        <>
          <dl className="fields">
            {config.detailFields(item).map((f) => (
              <Field key={f.label} label={f.label}>
                {f.value}
              </Field>
            ))}
            {symbols.length > 0 && (
              <Field label="Symbols" wide>
                <ul className="symbols">
                  {symbols.map(([symbol, meaning]) => (
                    <li key={symbol}>
                      <strong>{symbol}</strong> {meaning}
                    </li>
                  ))}
                </ul>
              </Field>
            )}
          </dl>

          {item.hazardClass && (
            <section>
              <h2>Hazard class</h2>
              <ClassCard code={item.hazardClass} />
            </section>
          )}

          {item.subsidiaryClasses.length > 0 && (
            <section>
              <h2>Subsidiary hazard {item.subsidiaryClasses.length > 1 ? "classes" : "class"}</h2>
              <div className="class-cards">
                {item.subsidiaryClasses.map((code) => (
                  <ClassCard key={code} code={code} />
                ))}
              </div>
            </section>
          )}

          {ExtraSections && <ExtraSections item={item} />}

          {config.quantityCards && item.hazardClass && <QuantityCards cards={config.quantityCards(item)} />}

          {item.provisionCodes.length > 0 && (
            <section>
              <h2>
                Special provisions
                {data.provisionsLink && (
                  <a className="heading-link" href={data.provisionsLink} target="_blank" rel="noreferrer">
                    full text ↗
                  </a>
                )}
              </h2>
              {item.cargoOnly && (
                <img
                  className="cao-label"
                  src={assetUrl("images/Cargo Aircraft Only.png")}
                  alt="Cargo Aircraft Only label"
                />
              )}
              <ul className="provisions">
                {item.provisionCodes.map((code) => (
                  <li key={code}>
                    <strong>{code}</strong>
                    <span className="pre-line">{data.provisionMap.get(code) || data.provisionsMissingText}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </article>
  );
};

export default HazardInfo;
