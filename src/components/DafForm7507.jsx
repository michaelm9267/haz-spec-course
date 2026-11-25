import React, { useLayoutEffect, useRef, useState } from "react";
import {
  additionalDescription,
  classText,
  packagesText,
  shippingName,
  totalQuantity,
} from "../utils/declaration";

// DAF Form 7507 (20250131), Shipper's Declaration for Dangerous Goods, prescribed by
// DAFI 24-605V2: page 1 is the declaration, page 2 the shipper's checklist.
// Wording is reproduced as printed on the form.

export const FORM_ID = "DAF FORM 7507, 20250131";
const FOOTER = `${FORM_ID}     PRESCRIBED BY DAFI24-605V2  REPLACES AMC IMT 1033, WHICH IS OBSOLETE`;

const Lines = ({ text }) =>
  (text || "").split("\n").map((l, i) => (
    <React.Fragment key={i}>
      {i > 0 && <br />}
      {l}
    </React.Fragment>
  ));

/** One of the "(DELETE NON-APPLICABLE)" boxes; the non-applicable one is struck through. */
const Choice = ({ children, deleted }) => (
  <span className={`f7507-choice${deleted ? " deleted" : ""}`}>{children}</span>
);

const L = ({ children }) => <span className="f7507-label">{children}</span>;

const Page = ({ children, className = "" }) => (
  <div className={`f7507-page ${className}`.trim()}>
    <div className="f7507-sheet">{children}</div>
    <div className="f7507-footer">{FOOTER}</div>
  </div>
);

const formatDate = (iso) => {
  const d = iso && new Date(`${iso}T00:00:00`);
  return d && !isNaN(d)
    ? d
        .toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
        .toUpperCase()
    : iso || "";
};

/** The form's emergency line takes numbers only: "(explosives/ammunition, …)" labels are dropped. */
export const phoneNumbers = (phone) =>
  (phone || "")
    .replace(/\s*\([^)]*\)/g, "")
    .split(/\s*;\s*/)
    .filter(Boolean)
    .join("; ");

const explosiveNew = (line, item) =>
  /^1(\.|$)/.test(item.hazardClass || "") && parseFloat(line.netExplosive) > 0 ? parseFloat(line.netExplosive) : null;
const fmtNum = (n) => (Math.round(n * 1000) / 1000).toLocaleString();

/**
 * Quantity and type of packing. For Class 1 the net explosive weight replaces the
 * mass/volume per package: "1 Fiberboard box (4G) × NEW 0.5 kg".
 */
export const formQuantity = (line, item) => {
  const n = explosiveNew(line, item);
  const p = parseFloat(line.packages);
  if (n === null || !(p > 0)) return packagesText(line);
  return `${fmtNum(p)} ${line.packageType} × NEW ${fmtNum(n)} kg`;
};
const formTotal = (line, item) => {
  const n = explosiveNew(line, item);
  const p = parseFloat(line.packages);
  return n === null ? totalQuantity(line) : p > 0 ? `NEW ${fmtNum(p * n)} kg` : "";
};

/**
 * Extra entries under the proper shipping name. Each of these has its own place on the
 * form instead: NEW in the quantity column, Cargo Aircraft Only in the aircraft
 * limitation box, LTD QTY in the authorization column (and RQ under the UN number).
 */
export const formExtras = (line, item, decl) =>
  additionalDescription(line, item, decl).filter(
    (a) => !/^NEW /.test(a) && a !== "Cargo Aircraft Only" && a !== "Limited Quantity"
  );

const DeclarationPage = ({ decl, lines, page = 1, pages = 1 }) => {
  const cao = decl.mode === "airCao";
  const handling = [decl.additionalInfo, decl.ergOnForm && decl.emergencyInfo]
    .filter((t) => t && t.trim())
    .join("\n");
  return (
    <Page className="f7507-decl-page">
      <table className="f7507">
        <colgroup>
          <col style={{ width: "58%" }} />
          <col style={{ width: "42%" }} />
        </colgroup>
        <tbody>
          <tr>
            <td colSpan={2} className="f7507-title">
              SHIPPER'S DECLARATION FOR DANGEROUS GOODS
            </td>
          </tr>
          <tr>
            <td className="f7507-shipper">
              <L>SHIPPER</L>
              <div className="f7507-value f7507-block">
                <Lines text={decl.shipper} />
              </div>
              <div className="f7507-inline">
                <span>
                  <L>PHONE NUMBER:</L>{" "}
                  <span className="f7507-value">{decl.shipperPhone}</span>
                </span>
                <span>
                  <L>DSN:</L>{" "}
                  <span className="f7507-value">{decl.shipperDsn}</span>
                </span>
              </div>
            </td>
            <td>
              <div>
                <L>AIR WAYBILL NO.</L>{" "}
                <span className="f7507-value">{decl.airWaybill}</span>
              </div>
              <div className="f7507-pages">
                <L>PAGE</L> <span className="f7507-value">{page}</span> <L>OF</L>{" "}
                <span className="f7507-value">{pages}</span> <L>PAGES</L>
              </div>
              <div>
                <L>SHIPPER'S REFERENCE NUMBER</L>
              </div>
              <div>
                <L>TCN:</L>{" "}
                <span className="f7507-value">{decl.reference}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td className="f7507-consignee">
              <L>CONSIGNEE</L>
              <div className="f7507-value f7507-block">
                <Lines text={decl.consignee} />
              </div>
            </td>
            <td />
          </tr>
          <tr>
            <td>
              <L>
                COMPLETED AND SIGNED COPIES OF THIS
                <br />
                DECLARATION MUST BE HANDED TO THE OPERATOR
              </L>
            </td>
            <td rowSpan={2} className="f7507-warning">
              <strong>WARNING</strong>
              <p>
                Failure to comply in all respects with applicable Hazardous
                Materials/Dangerous Goods Regulations may be in breach of the
                applicable law, subject to legal penalties
              </p>
            </td>
          </tr>
          <tr>
            <td className="f7507-bar">TRANSPORTATION DETAILS</td>
          </tr>
          <tr>
            <td className="f7507-split">
              <div>
                <L>THIS SHIPMENT IS WITHIN THE LIMITATIONS PRESCRIBED FOR:</L>
                <div className="f7507-note">(DELETE NON-APPLICABLE)</div>
                <div className="f7507-choices">
                  <Choice deleted={cao}>
                    PASSENGER AND
                    <br />
                    CARGO AIRCRAFT
                  </Choice>
                  <Choice deleted={!cao}>
                    CARGO AIRCRAFT
                    <br />
                    ONLY
                  </Choice>
                </div>
              </div>
              <div>
                <L>AIRPORT OF DEPARTURE:</L>
                <div className="f7507-value">{decl.departure}</div>
              </div>
            </td>
            <td rowSpan={2}>
              <L>SHIPMENT TYPE: (DELETE NON-APPLICABLE)</L>
              <div className="f7507-choices">
                <Choice deleted={decl.radioactive}>NON-RADIOACTIVE</Choice>
                <Choice deleted={!decl.radioactive}>RADIOACTIVE</Choice>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <L>AIRPORT OF DESTINATION:</L>{" "}
              <span className="f7507-value">{decl.destination}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="f7507-goods-wrap">
        <table className="f7507 f7507-goods">
          <colgroup>
            <col style={{ width: "9.5%" }} />
            <col style={{ width: "26%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "7.5%" }} />
            <col style={{ width: "18.5%" }} />
            <col style={{ width: "11.5%" }} />
            <col style={{ width: "13%" }} />
          </colgroup>
          <thead>
            <tr>
              <th colSpan={7} className="f7507-bar">
                NATURE AND QUALITY OF DANGEROUS GOODS
              </th>
            </tr>
            <tr>
              <th colSpan={4}>DANGEROUS GOODS IDENTIFICATION</th>
              <th rowSpan={2}>
                QUANTITY AND
                <br />
                TYPE of PACKING
              </th>
              <th rowSpan={2}>PACKING INST</th>
              <th rowSpan={2}>AUTHORIZATION</th>
            </tr>
            <tr>
              <th>UN or ID NO.</th>
              <th>PROPER SHIPPING NAME</th>
              <th>
                CLASS or DIVISION
                <br />
                (SUBSIDIARY RISK)
              </th>
              <th>PACKING GROUP</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(({ line, item }, i) => (
              <tr key={i} className="f7507-item">
                <td>
                  {item.un}
                  {line.rq && <div>RQ</div>}
                </td>
                <td>
                  {shippingName(line, item)}
                  {formExtras(line, item, decl).map((a) => (
                    <div key={a} className="f7507-extra">
                      {a}
                    </div>
                  ))}
                </td>
                <td>{classText(item)}</td>
                <td>{item.pg}</td>
                <td>
                  {formQuantity(line, item)}
                  {Number(line.packages) > 1 && formTotal(line, item) && (
                    <div className="f7507-extra">
                      Total {formTotal(line, item)}
                    </div>
                  )}
                </td>
                <td>{line.packing}</td>
                <td>
                  {line.authorization}
                  {line.limitedQuantity && <div>LTD QTY</div>}
                </td>
              </tr>
            ))}
            <tr className="f7507-filler">
              {Array.from({ length: 7 }, (_, i) => (
                <td key={i} />
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <table className="f7507">
        <tbody>
          <tr>
            <td className="f7507-handling">
              <L>ADDITIONAL HANDLING INFORMATION</L>
              <div className="f7507-value f7507-block">
                <Lines text={handling} />
              </div>
              <div className="f7507-emergency">
                <L>EMERGENCY TELEPHONE NUMBER:</L>{" "}
                <span className="f7507-value">
                  {phoneNumbers(decl.emergencyPhone)}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="f7507">
        <colgroup>
          <col style={{ width: "64%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "18%" }} />
        </colgroup>
        <tbody>
          <tr>
            <td rowSpan={3} className="f7507-cert">
              {decl.certification}
            </td>
            <td colSpan={2}>
              <L>NAME/TITLE OF SIGNATORY</L>
              <div className="f7507-value">
                {decl.signatory}
                {decl.signatoryTitle && `, ${decl.signatoryTitle}`}
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="f7507-noborder-bottom">
              <L>PLACE AND DATE</L>
              <div className="f7507-place">
                <span className="f7507-value">{decl.place}</span>
                <span className="f7507-value">{formatDate(decl.date)}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="f7507-signature">
              <L>SIGNATURE</L>
              <div className="f7507-note">
                <em>(see warning above)</em>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </Page>
  );
};

// ---------- page 2: shipper's checklist ----------

// [text, sub-items?]; a string starting with "#" is an "IF APPLICABLE"-style heading.
const CHECKLIST_LEFT = [
  {
    title: "1. - SHIPPER'S DECLARATION",
    items: [
      "THREE ORIGINAL DOCUMENTS (TWO FOR MOBILITY)",
      "SHIPPERS ADDRESS AND PHONE NUMBER",
      "TCN",
      "AIRCRAFT LIMITATIONS IDENTIFIED",
      "AIRPORT DEPARTURE",
      "AIRPORT DESTINATION",
      "SHIPMENT TYPE",
      "CORRECT ERN FOR COMMODITY",
      "NAME AND TITLE OF PREPARER",
      "PLACE AND DATE CERTIFIED",
      "SIGNATURE",
      "PEN/INK CHANGES SIGNED",
    ],
  },
  {
    title: "2. - CARGO IDENTIFICATION",
    items: [
      "UN/ID NUMBER",
      "PSN",
      "CLASS/DIVISION (SUBSIDIARY RISK, IF APPLICABLE)",
      "PACKING GROUP, IF APPLICABLE",
      "NUMBER AND TYPE OF PACKAGES",
      "NET QUANTITY PER PACKAGE IN METRIC (UNLESS OTHER MEASUREMENTS AUTHORIZED)",
      "NET QUANTITY OF EXPLOSIVES (CLASS 1) IDENTIFIES N.E.W. OF PACKAGE OR PALLET IN METRIC",
      [
        "RADIOACTIVE ONLY",
        [
          "ACTIVITY PER PACKAGE GIVEN IN BECQUERELS",
          "NAME AND SYMBOL OF MATERIAL",
          "MATERIAL PHYSICAL AND CHEMICAL FORM",
          "CATEGORY OF PACKAGE",
          "TRANSPORT INDEX",
        ],
      ],
      "PACKAGING PARAGRAPH FROM ATTACHMENT 5-13 OR 27",
      [
        "OTHER PACKAGING REFERENCE USED",
        [
          "COE (COPY PROVIDED)",
          "CAA (COPY PROVIDED)",
          "WAIVER (COPY PROVIDED)",
          "49CFR",
          "IATA/ACAO",
          "EXEMPTION (COPY PROVIDED)",
        ],
      ],
      "#IF APPLICABLE",
      [
        "PSN (ADDITIONAL INFORMATION, AS REQUIRED)",
        [
          "TECHNICAL NAME",
          '"RQ" USED TO IDENTIFY A HAZARDOUS SUBSTANCE',
          '"WASTE" IF MEETING A DEFINITION',
          '"INHALATION HAZARD - (AND ZONE)"',
        ],
      ],
      'USE OF OVERPACKS IDENTIFIED ("OVERPACK USED")',
      "PACKAGES MEETING LIMITED QUANTITY",
      "CRYOGENIC VENTING REQUIREMENTS",
      "SECONDARY HAZARDS IDENTIFIED BY PSN, CLASS/DIVISION, NET QUANTITY",
      "HANDLING INSTRUCTIONS",
    ],
  },
];

const CHECKLIST_RIGHT = [
  {
    title: "3. - PACKAGING-INNER (COMBINATION PACKAGES)",
    items: [
      "ABSORBENT MATERIAL USED IAW ATTACHMENT 20 OR WHEN DIRECTED BY PACKAGING DIRECTIVE",
      "RECEPTACLES/PACKAGES, CONTAINING LIQUIDS, ORIENTATED IN UPRIGHT POSITION",
      'INSIDE RECEPTACLES/PACKAGES, CONTAINING LIQUIDS, VERIFIED AS MEETING "AIR ELIGIBLE" TEST PRESSURE REQUIREMENTS',
      "SECONDARY CLOSURES USED",
      "LEAK PROOF LINERS USED",
      "ACID PROOF LINERS USED FOR WELL-CELL BATTERIES",
    ],
  },
  {
    title: "4. - PACKAGING- OUTER",
    items: [
      "SERVICEABLE (NO DAMAGE THAT WOULD ALLOW LOSS OF CONTENTS)",
      [
        "UN SPECIFICATION OUTER CONTAINER PACKAGING USED AND CLOSED IAW",
        ["DoD POP PROGRAM", "MANUFACTURER'S SUPPLIED METHOD OR REPORT", "SPI"],
      ],
      "STRONG OUTSIDE CONTAINER USED (WHEN AUTHORIZED)",
      "PACKAGING WAIVER",
      "SINGLE PACKAGING (FOR LIQUIDS) MEETS PRESSURE REQUIREMENTS",
      "ULLAGE (FOR LIQUIDS)",
    ],
  },
  {
    title: "5. - MARKING",
    items: [
      "PSN AND UN/ID NUMBER",
      "#IF APPLICABLE",
      "UN SPECIFICATION",
      '"AIR ELIGIBLE" OR SYMBOL FOR COMBINATION PACKAGES CONTAINING LIQUIDS',
      '"RQ" OR "WASTE" IN ASSOCIATION WITH PSN',
      '"INHALATION HAZARD" (IF NOT PART LABEL)',
      '"ORIENTATION" ARROWS',
      '"LIMITED QUANTITY"',
      "OVERPACKS IDENTIFIED",
      "DOT-E, COE, AND CAA (IF REQUIRED) NUMBER",
      "FLASHPOINT",
    ],
  },
  {
    title: "6. - LABELING",
    items: [
      "PRIMARY RISK",
      "SUBSIDIARY RISK (IF APPLICABLE)",
      '"CARGO AIRCRAFT ONLY" (IF APPLICABLE)',
    ],
  },
];

const CheckItem = ({ entry }) => {
  if (typeof entry === "string" && entry.startsWith("#"))
    return <li className="f7507-check-heading">{entry.slice(1)}</li>;
  const [text, subs] = typeof entry === "string" ? [entry] : entry;
  return (
    <li>
      <span className="f7507-blank" />
      <span>{text}</span>
      {subs && (
        <ul>
          {subs.map((s) => (
            <li key={s}>
              <span className="f7507-blank" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

const ChecklistColumn = ({ sections }) => (
  <div>
    {sections.map((s) => (
      <section key={s.title}>
        <h4>{s.title}</h4>
        <ul className="f7507-checks">
          {s.items.map((e, i) => (
            <CheckItem key={i} entry={e} />
          ))}
        </ul>
      </section>
    ))}
  </div>
);

const ChecklistPage = () => (
  <Page>
    <div className="f7507-checklist">
      <div className="f7507-check-title">
        <strong>SHIPPER'S CHECKLIST</strong>
        <div>(TO BE USED IN CONJUNCTION WITH AFMAN24-204(I), ATTACHMENT 2)</div>
      </div>
      <div className="f7507-check-spacer" />
      <div className="f7507-check-cols">
        <ChecklistColumn sections={CHECKLIST_LEFT} />
        <ChecklistColumn sections={CHECKLIST_RIGHT} />
      </div>
    </div>
  </Page>
);

/**
 * Moves the last item of any declaration page whose Dangerous Goods Identification
 * box overflows to the next page, until every item fits (a single item that is
 * taller than the box stays on its own page). Measured after layout, so in an
 * environment without layout (tests) everything stays on one page.
 */
export function paginate(counts, overflowing) {
  const next = [...counts];
  for (let i = 0; i < next.length; i++) {
    if (overflowing[i] && next[i] > 1) {
      next[i] -= 1;
      if (i + 1 < next.length) next[i + 1] += 1;
      else next.push(1);
      return next;
    }
  }
  return null;
}

const goodsOverflow = (pageEl) => {
  const wrap = pageEl.querySelector(".f7507-goods-wrap");
  const table = wrap && wrap.querySelector(".f7507-goods");
  if (!table) return false;
  const used = [...table.querySelectorAll("thead, tr.f7507-item")].reduce((h, el) => h + el.getBoundingClientRect().height, 0);
  return used > wrap.clientHeight + 0.5;
};

const DafForm7507 = ({ decl, lines }) => {
  const ref = useRef(null);
  const [counts, setCounts] = useState([lines.length]);
  const total = counts.reduce((a, b) => a + b, 0);
  // the item list changed (e.g. regenerated): start again from one page
  if (total !== lines.length) setCounts([lines.length]);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const pageEls = [...ref.current.querySelectorAll(".f7507-decl-page")];
    if (pageEls.length !== counts.length) return;
    const next = paginate(counts, pageEls.map(goodsOverflow));
    if (next) setCounts(next);
  }, [counts]);

  let start = 0;
  const groups = counts.map((n) => {
    const g = lines.slice(start, start + n);
    start += n;
    return g;
  });

  return (
    <div ref={ref}>
      {groups.map((g, i) => (
        <DeclarationPage key={i} decl={decl} lines={g} page={i + 1} pages={groups.length} />
      ))}
      <ChecklistPage />
    </div>
  );
};

export default DafForm7507;
