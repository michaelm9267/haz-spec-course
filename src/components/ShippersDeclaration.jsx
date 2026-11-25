import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useRegulation } from "../regulations/RegulationContext";
import ItemPicker from "./ItemPicker";
import DodaacPicker from "./DodaacPicker";
import { formatAddress } from "../utils/dodaac";
import DafForm7507 from "./DafForm7507";
import { emergencyContacts, ergFor, ergText, loadErg } from "../utils/erg";
import {
  CERTIFICATIONS,
  CFR_MODES,
  PACKAGE_TYPES,
  UNITS,
  additionalDescription,
  basicDescription,
  blankDeclaration,
  checkDeclaration,
  classText,
  isAir,
  newLine,
  packagesText,
  technicalNameRequired,
  totalQuantity,
} from "../utils/declaration";
import { division } from "../utils/quantities";
import "../Styles/declaration.css";

const OLD_AFMAN_CERTIFICATION = /^I hereby certify that the contents of this consignment .*transport by military aircraft according to AFMAN 24-604/;

const STORAGE_KEY = (reg) => `hazref.declaration.${reg}`;

const loadDraft = (reg) => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY(reg)));
    if (saved && Array.isArray(saved.lines)) {
      const decl = { ...blankDeclaration(reg), ...saved };
      // Drafts saved with the old DD Form 1387-2 wording get the DAF Form 7507 certification.
      if (reg === "afman" && OLD_AFMAN_CERTIFICATION.test(decl.certification)) decl.certification = CERTIFICATIONS.afman;
      return decl;
    }
  } catch {
    // no saved draft
  }
  return blankDeclaration(reg);
};

const saveDraft = (reg, decl) => {
  try {
    localStorage.setItem(STORAGE_KEY(reg), JSON.stringify(decl));
  } catch {
    // storage unavailable; the form still works for this visit
  }
};

const Field = ({ label, children, wide, hint }) => (
  <label className={`decl-field${wide ? " wide" : ""}`}>
    <span>{label}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
);

// ---------- generated document (editable once generated) ----------

const Lines = ({ text }) =>
  (text || "").split("\n").map((l, i) => (
    <React.Fragment key={i}>
      {i > 0 && <br />}
      {l}
    </React.Fragment>
  ));

const SignatureBlock = ({ decl }) => (
  <div className="doc-sign">
    <div>
      <div className="doc-label">Name / title of signatory</div>
      <div>
        {decl.signatory}
        {decl.signatoryTitle && `, ${decl.signatoryTitle}`}
      </div>
    </div>
    <div>
      <div className="doc-label">Place and date</div>
      <div>{[decl.place, decl.date].filter(Boolean).join(", ")}</div>
    </div>
    <div>
      <div className="doc-label">Signature</div>
      <div className="doc-signature-line" />
    </div>
  </div>
);

const CfrDocument = ({ decl, lines }) => {
  const air = isAir(decl);
  return (
    <>
      <div className="doc-title">
        <h2>{air ? "Shipper's Declaration for Dangerous Goods" : "Hazardous Materials Shipping Paper"}</h2>
        <div>49 CFR Part 172, Subpart C — {CFR_MODES[decl.mode]}</div>
      </div>
      <table className="doc-grid">
        <tbody>
          <tr>
            <td className="doc-half">
              <div className="doc-label">Shipper</div>
              <Lines text={decl.shipper} />
            </td>
            <td>
              <div className="doc-label">Consignee</div>
              <Lines text={decl.consignee} />
            </td>
          </tr>
          <tr>
            <td>
              <div className="doc-label">Carrier</div>
              {decl.carrier}
            </td>
            <td>
              <div className="doc-label">Shipping paper / air waybill no.</div>
              {decl.reference}
            </td>
          </tr>
          <tr>
            <td>
              <div className="doc-label">{air ? "Airport of departure" : "Origin"}</div>
              {decl.departure}
            </td>
            <td>
              <div className="doc-label">{air ? "Airport of destination" : "Destination"}</div>
              {decl.destination}
            </td>
          </tr>
          <tr>
            <td>
              <div className="doc-label">Date</div>
              {decl.date}
            </td>
            <td>
              <div className="doc-label">Page</div>1 of 1
            </td>
          </tr>
        </tbody>
      </table>

      <table className="doc-items">
        <thead>
          <tr>
            <th>HM</th>
            <th>No. and type of packages</th>
            <th>Basic description (UN No., proper shipping name, hazard class, PG)</th>
            <th>Total quantity</th>
            <th>Additional information / authorization</th>
          </tr>
        </thead>
        <tbody>
          {lines.map(({ line, item }, i) => (
            <tr key={i}>
              <td className="doc-hm">X</td>
              <td>{packagesText(line)}</td>
              <td>{basicDescription(line, item)}</td>
              <td>{totalQuantity(line)}</td>
              <td>
                {[...additionalDescription(line, item, decl), line.packing && `Packaging ${line.packing}`, line.authorization]
                  .filter(Boolean)
                  .map((a) => (
                    <div key={a}>{a}</div>
                  ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="doc-box">
        {decl.additionalInfo && (
          <>
            <div className="doc-label">Additional information</div>
            <p>
              <Lines text={decl.additionalInfo} />
            </p>
          </>
        )}
        {decl.emergencyInfo && (
          <div className="doc-emergency">
            <div className="doc-label">Emergency response information</div>
            <Lines text={decl.emergencyInfo} />
          </div>
        )}
        <div className="doc-emergency">
          Emergency response telephone (24 hours): <strong>{decl.emergencyPhone}</strong>
          {decl.emergencyContact && ` — ${decl.emergencyContact}`}
        </div>
      </div>

      <div className="doc-box doc-cert">
        <p>{decl.certification}</p>
        {air && <p>{CERTIFICATIONS.cfrAir}</p>}
        <SignatureBlock decl={decl} />
      </div>
    </>
  );
};

/** Rendered once per "Generate"; memoised so React never overwrites the user's in-place edits. */
const DeclarationDocument = memo(({ regKey, decl, items }) => {
  const lines = decl.lines.map((line) => ({ line, item: items[line.id] })).filter((x) => x.item);
  return (
    <div className={`decl-doc doc-${regKey}`} contentEditable suppressContentEditableWarning spellCheck={false} aria-label="Shipper's declaration (editable)">
      {regKey === "afman" ? <DafForm7507 decl={decl} lines={lines} /> : <CfrDocument decl={decl} lines={lines} />}
    </div>
  );
});

// ---------- line editor ----------

const LineEditor = ({ index, line, item, regKey, ergInfo, onChange, onRemove }) => {
  const set = (k) => (e) => onChange({ ...line, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const needsTech = technicalNameRequired(item, regKey);
  const explosive = division(item.hazardClass)?.[0] === "1";
  return (
    <li className="decl-line">
      <div className="decl-line-head">
        <span className="decl-line-no">{index + 1}</span>
        <Link to={`/${regKey}/item/${item.id}`}>
          <strong>{item.un}</strong> {item.name}
        </Link>
        <span className="cls">{classText(item)}</span>
        {item.pg && <span className="cls">PG {item.pg}</span>}
        {ergInfo && (
          <span className={`cls${ergInfo.tih ? " erg-tih" : ""}`} title={`${ergInfo.title}${ergInfo.tih ? " — toxic inhalation hazard, see Table 1" : ""}`}>
            ERG {ergInfo.guide}
            {ergInfo.tih ? " · TIH" : ""}
          </span>
        )}
        <button className="remove" onClick={onRemove} aria-label={`Remove line ${index + 1}`}>
          ×
        </button>
      </div>
      <div className="decl-fields">
        <Field label={`Technical name${needsTech ? " (required)" : ""}`} wide hint={needsTech ? "This entry requires a technical name in parentheses." : undefined}>
          <input value={line.technicalName} onChange={set("technicalName")} placeholder={needsTech ? "e.g. Toluene, Xylene" : "Optional"} />
        </Field>
        <Field label="No. of packages">
          <input type="number" min="1" step="1" value={line.packages} onChange={set("packages")} />
        </Field>
        <Field label="Package type">
          <input list="decl-package-types" value={line.packageType} onChange={set("packageType")} />
        </Field>
        <Field label="Quantity per package">
          <div className="calc-input-row">
            <input type="number" min="0" step="any" value={line.quantity} onChange={set("quantity")} />
            <select value={line.unit} onChange={set("unit")} aria-label="Unit">
              {Object.entries(UNITS).map(([u, d]) => (
                <option key={u} value={u}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </Field>
        <Field label={regKey === "afman" ? "Packing paragraph" : "Packaging section"}>
          <input value={line.packing} onChange={set("packing")} />
        </Field>
        <Field label="Authorization" hint={regKey === "afman" ? "e.g. special provision, CAA/waiver, DOT-SP" : "e.g. DOT-SP 12345, approval"}>
          <input value={line.authorization} onChange={set("authorization")} />
        </Field>
        {explosive && (
          <Field label="Net explosive weight (kg)">
            <input type="number" min="0" step="any" value={line.netExplosive} onChange={set("netExplosive")} />
          </Field>
        )}
      </div>
      <div className="decl-checks">
        <label>
          <input type="checkbox" checked={line.rq} onChange={set("rq")} /> RQ (hazardous substance)
        </label>
        <label>
          <input type="checkbox" checked={line.limitedQuantity} onChange={set("limitedQuantity")} /> Limited quantity
        </label>
        <label>
          <input type="checkbox" checked={line.waste} onChange={set("waste")} /> Waste
        </label>
      </div>
    </li>
  );
};

// ---------- page ----------

const ShippersDeclaration = () => {
  const { key, config, data } = useRegulation();
  // Each regulation keeps its own draft; the draft is stored with the regulation it belongs to.
  const [draft, setDraft] = useState(() => ({ reg: key, decl: loadDraft(key) }));
  const [generated, setGenerated] = useState(null);
  const [generation, setGeneration] = useState(0);
  const [redBorders, setRedBorders] = useState(() => {
    try {
      return localStorage.getItem("hazref.declaration.redBorders") !== "off";
    } catch {
      return true;
    }
  });
  const toggleRedBorders = (on) => {
    setRedBorders(on);
    try {
      localStorage.setItem("hazref.declaration.redBorders", on ? "on" : "off");
    } catch {
      // storage unavailable
    }
  };
  const docRef = useRef(null);
  const [erg, setErg] = useState(null);
  useEffect(() => {
    let live = true;
    loadErg()
      .then((e) => live && setErg(e))
      .catch(() => {}); // the form still works without ERG data
    return () => {
      live = false;
    };
  }, []);

  if (draft.reg !== key) {
    setDraft({ reg: key, decl: loadDraft(key) });
    setGenerated(null);
  }
  const decl = draft.reg === key ? draft.decl : blankDeclaration(key);
  const setDecl = (d) => setDraft({ reg: key, decl: d });
  useEffect(() => saveDraft(draft.reg, draft.decl), [draft]);

  // Emergency phone and agency follow the materials (ERG DoD numbers) while left blank.
  const auto = useMemo(
    () => (data ? emergencyContacts(decl.lines.map((l) => data.items[l.id]).filter(Boolean), { international: decl.international })
        : { phone: "", contact: "" }),
    [decl.lines, decl.international, data]
  );
  const resolved = { ...decl, emergencyPhone: decl.emergencyPhone || auto.phone, emergencyContact: decl.emergencyContact || auto.contact };
  const issues = useMemo(
    () => (data ? checkDeclaration(resolved, data.items, key, data.substances, erg) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [decl, auto, data, key, erg]
  );

  if (!data) return <p className="status">Loading {config.name}…</p>;

  const set = (k) => (e) => setDecl({ ...decl, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const setLines = (lines) => setDecl({ ...decl, lines });
  const errors = issues.filter((i) => i.level === "error");
  const isAfman = key === "afman";
  // Emergency response information follows the materials until the user edits it.
  const autoEmergencyInfo = erg ? ergText(erg, decl.lines.map((l) => data.items[l.id]).filter(Boolean)) : "";
  const emergencyInfo = decl.emergencyInfo ?? autoEmergencyInfo;

  const generate = () => {
    setGenerated({ ...JSON.parse(JSON.stringify(resolved)), emergencyInfo });
    setGeneration((g) => g + 1);
    setTimeout(() => docRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const reset = () => {
    if (window.confirm("Clear the whole form?")) {
      setDecl(blankDeclaration(key));
      setGenerated(null);
    }
  };

  return (
    <div className="declaration">
      <div className="decl-head no-print">
        <div>
          <h1>Shipper's declaration</h1>
          <p className="compat-intro">
            {isAfman
              ? "Fill in the shipment and add each hazardous material to build a DAF Form 7507 (Shipper's Declaration for Dangerous Goods) for AFMAN 24-604."
              : "Fill in the shipment and add each hazardous material to build a 49 CFR shipping paper (§§ 172.200–172.205)."}{" "}
            Switch regulation in the header. Your draft is kept in this browser.
          </p>
        </div>
        <button className="decl-secondary" onClick={reset}>
          Clear form
        </button>
      </div>

      <section className="calc-card no-print">
        <h2>Shipment</h2>
        <div className="decl-fields">
          <div className="decl-field wide">
            <label className="decl-field">
              <span>Shipper (name and address)</span>
              <textarea rows={4} value={decl.shipper} onChange={set("shipper")} />
            </label>
            <DodaacPicker
              label="Fill shipper from a DoDAAC"
              placeholder="Fill from DoDAAC: code, unit, base or ZIP"
              onPick={(a) => setDecl({ ...decl, shipper: formatAddress(a), international: decl.international || a.overseas })}
            />
          </div>
          <div className="decl-field wide">
            <label className="decl-field">
              <span>Consignee (name and address)</span>
              <textarea rows={4} value={decl.consignee} onChange={set("consignee")} />
            </label>
            <DodaacPicker
              label="Fill consignee from a DoDAAC"
              placeholder="Fill from DoDAAC: code, unit, base or ZIP"
              onPick={(a) => setDecl({ ...decl, consignee: formatAddress(a), international: decl.international || a.overseas })}
            />
          </div>
          {isAfman ? (
            <Field label="Aircraft">
              <select value={decl.mode} onChange={set("mode")}>
                <option value="airPax">Passenger and cargo aircraft</option>
                <option value="airCao">Cargo aircraft only</option>
              </select>
            </Field>
          ) : (
            <Field label="Mode of transport">
              <select value={decl.mode} onChange={set("mode")}>
                {Object.entries(CFR_MODES).map(([m, l]) => (
                  <option key={m} value={m}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {isAfman && (
            <>
              <Field label="Shipper phone number">
                <input type="tel" value={decl.shipperPhone || ""} onChange={set("shipperPhone")} />
              </Field>
              <Field label="Shipper DSN">
                <input type="tel" value={decl.shipperDsn || ""} onChange={set("shipperDsn")} />
              </Field>
              <Field label="Air waybill no.">
                <input value={decl.airWaybill || ""} onChange={set("airWaybill")} />
              </Field>
            </>
          )}
          <Field label={isAfman ? "Transportation control number (TCN)" : isAir(decl) ? "Air waybill no." : "Shipping paper / BOL no."}>
            <input value={decl.reference} onChange={set("reference")} />
          </Field>
          {!isAfman && (
            <Field label="Carrier">
              <input value={decl.carrier} onChange={set("carrier")} />
            </Field>
          )}
          <Field label={isAfman || isAir(decl) ? "Airport of departure" : "Origin"}>
            <input value={decl.departure} onChange={set("departure")} />
          </Field>
          <Field label={isAfman || isAir(decl) ? "Airport of destination" : "Destination"}>
            <input value={decl.destination} onChange={set("destination")} />
          </Field>
          <Field label="Date">
            <input type="date" value={decl.date} onChange={set("date")} />
          </Field>
          {isAfman && (
            <label className="decl-checkbox">
              <input type="checkbox" checked={decl.radioactive} onChange={set("radioactive")} /> Radioactive shipment
            </label>
          )}
          <label className="decl-checkbox" title="Origin or destination outside the U.S. Picking an overseas DoDAAC ticks this.">
            <input type="checkbox" checked={!!decl.international} onChange={set("international")} /> International shipment
          </label>
        </div>
      </section>

      <section className="calc-card no-print">
        <h2>Hazardous materials ({decl.lines.length})</h2>
        <ItemPicker
          items={data.items}
          onAdd={(item) => setLines([...decl.lines, newLine(item, key)])}
          placeholder={`Add from ${config.name} by UN number or shipping name`}
          label="Add a hazardous material"
        />
        <datalist id="decl-package-types">
          {PACKAGE_TYPES.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        {decl.lines.length === 0 ? (
          <p className="compat-empty">Search above to add the first item. The UN number, shipping name, class and packing group fill in automatically.</p>
        ) : (
          <ol className="decl-lines">
            {decl.lines.map((line, i) =>
              data.items[line.id] ? (
                <LineEditor
                  key={i}
                  index={i}
                  line={line}
                  item={data.items[line.id]}
                  regKey={key}
                  ergInfo={erg && ergFor(erg, data.items[line.id])}
                  onChange={(l) => setLines(decl.lines.map((x, j) => (j === i ? l : x)))}
                  onRemove={() => setLines(decl.lines.filter((_, j) => j !== i))}
                />
              ) : null
            )}
          </ol>
        )}
      </section>

      <section className="calc-card no-print">
        <h2>Emergency response and certification</h2>
        <div className="decl-fields">
          <Field
            label="24-hour emergency response telephone"
            hint={
              decl.emergencyPhone
                ? "Entered by you. Clear it to use the ERG's DoD number for these materials."
                : auto.phone
                ? decl.international && /1-800-851-8061/.test(auto.phone)
                  ? "ERG DoD number. DLA's 1-800 line is U.S. toll-free; add a number reachable from abroad for an international route."
                  : "ERG DoD number for these materials (Army Operations Center for explosives/ammunition, DLA for all other). Type to override."
                : "Filled in from the ERG once you add materials."
            }
          >
            <input type="tel" value={resolved.emergencyPhone} onChange={set("emergencyPhone")} />
          </Field>
          <Field
            label={isAfman ? "Emergency contact / agency" : "Contract or offeror name (§ 172.604(b))"}
            hint={
              decl.emergencyContact
                ? "Entered by you. Clear it to use the ERG agency."
                : !isAfman && auto.contact
                ? "For DoD shipments. For other shipments enter your registered emergency response provider."
                : undefined
            }
          >
            <input value={resolved.emergencyContact} onChange={set("emergencyContact")} />
          </Field>
          <Field
            label="Emergency response information"
            wide
            hint={
              decl.emergencyInfo === undefined
                ? `Filled in from the ${erg?.edition || "ERG"} guide for each UN number added. Edit to override.`
                : "Edited by you. Use “Fill from UN numbers” to go back to the ERG guides."
            }
          >
            <textarea
              rows={Math.max(2, emergencyInfo.split("\n").length)}
              value={emergencyInfo}
              placeholder={decl.lines.length ? "" : "Add hazardous materials to fill this in from the ERG."}
              onChange={set("emergencyInfo")}
            />
          </Field>
          {isAfman && (
            <label className="decl-checkbox wide">
              <input type="checkbox" checked={!!decl.ergOnForm} onChange={set("ergOnForm")} /> Print ERG guides on the form
              (under Additional Handling Information)
            </label>
          )}
          {decl.emergencyInfo !== undefined && (
            <div className="decl-field wide">
              <button type="button" className="decl-secondary" onClick={() => setDecl({ ...decl, emergencyInfo: undefined })}>
                Fill from UN numbers
              </button>
            </div>
          )}
          <Field label="Additional handling information" wide>
            <textarea rows={2} value={decl.additionalInfo} onChange={set("additionalInfo")} />
          </Field>
          <Field label="Name of signatory">
            <input value={decl.signatory} onChange={set("signatory")} />
          </Field>
          <Field label="Title / rank">
            <input value={decl.signatoryTitle} onChange={set("signatoryTitle")} />
          </Field>
          <Field label="Place">
            <input value={decl.place} onChange={set("place")} />
          </Field>
          <Field
            label="Certification statement"
            wide
            hint={
              isAfman
                ? "As printed on DAF Form 7507 (20250131)."
                : isAir(decl)
                ? "§ 172.204(a). The air statement of § 172.204(c)(2) is added automatically."
                : "§ 172.204(a)(1)."
            }
          >
            <textarea rows={3} value={decl.certification} onChange={set("certification")} />
          </Field>
        </div>
      </section>

      <section className={`decl-issues no-print${errors.length ? " has-errors" : ""}`} aria-live="polite">
        <h2>{issues.length === 0 ? "Ready to generate" : `Checks (${errors.length} to fix, ${issues.length - errors.length} to review)`}</h2>
        {issues.length > 0 && (
          <ul>
            {issues.map((i, n) => (
              <li key={n} className={`issue-${i.level}`}>
                <span className="issue-tag">{i.level === "error" ? "Fix" : "Review"}</span> {i.text}
              </li>
            ))}
          </ul>
        )}
        <div className="decl-actions">
          <button className="decl-primary" onClick={generate}>
            {generated ? "Regenerate declaration" : "Generate declaration"}
          </button>
          {errors.length > 0 && <span className="decl-muted">You can still generate it; the items above are flagged.</span>}
        </div>
      </section>

      {generated && (
        <section className="decl-output" ref={docRef}>
          <div className="decl-output-bar no-print">
            <span>
              Click anywhere in the declaration to edit it. Regenerating replaces your edits with the form's contents.
            </span>
            {isAfman && (
              <label className="decl-toggle">
                <input type="checkbox" checked={redBorders} onChange={(e) => toggleRedBorders(e.target.checked)} /> Red borders
              </label>
            )}
            <button className="decl-primary" onClick={() => window.print()}>
              Print / save as PDF
            </button>
          </div>
          <div className={isAfman && redBorders ? "f7507-borders" : undefined}>
            <DeclarationDocument key={generation} regKey={key} decl={generated} items={data.items} />
          </div>
        </section>
      )}
    </div>
  );
};

export default ShippersDeclaration;
