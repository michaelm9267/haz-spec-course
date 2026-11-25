import React from "react";
import { assetUrl, getHazardClass } from "../utils/hazard";

// An illustration of the package from packagingPlan(): a fiberboard box (front, top
// and right side) or a gas cylinder, with the markings and labels where they go.
// Numbered callouts match the numbered lists beside it.

const wrap = (text, max) => {
  const out = [];
  let line = "";
  text.split(/\s+/).forEach((w) => {
    if ((line + " " + w).trim().length > max && line) {
      out.push(line);
      line = w;
    } else line = (line + " " + w).trim();
  });
  if (line) out.push(line);
  return out;
};

const Callout = ({ n, x, y }) =>
  n ? (
    <g className="pkg-callout" aria-hidden="true">
      <circle cx={x} cy={y} r="8" />
      <text x={x} y={y + 3.5} textAnchor="middle">
        {n}
      </text>
    </g>
  ) : null;

/** Hazard label (diamond image), or a drawn diamond when there's no image. */
const HazardLabel = ({ code, x, y, size }) => {
  const info = getHazardClass(code);
  return (
    <g>
      <title>{info ? `${info.Label} label` : `Class ${code} label`}</title>
      {info?.LabelImage ? (
        <image href={assetUrl(info.LabelImage)} x={x} y={y} width={size} height={size} />
      ) : (
        <g>
          <rect x={x + size * 0.15} y={y + size * 0.15} width={size * 0.7} height={size * 0.7} transform={`rotate(45 ${x + size / 2} ${y + size / 2})`} fill="#fff" stroke="#000" />
          <text x={x + size / 2} y={y + size / 2 + 4} textAnchor="middle" fontSize="12" fontWeight="700">
            {code}
          </text>
        </g>
      )}
      {/1\.[1-6][A-Z]/.test(code) && (
        <text x={x + size / 2} y={y + size * 0.78} textAnchor="middle" fontSize={size * 0.13} fontWeight="700">
          {code}
        </text>
      )}
    </g>
  );
};

const CaoLabel = ({ x, y, w }) => (
  <g>
    <title>Cargo Aircraft Only label</title>
    <image href={assetUrl("images/Cargo Aircraft Only.png")} x={x} y={y} width={w} height={w * 0.9} preserveAspectRatio="xMidYMid meet" />
  </g>
);

/** Limited quantity mark: square-on-point, black top and bottom, optional Y for air. */
const LqMark = ({ x, y, size, air }) => {
  const c = size / 2;
  const b = size * 0.2; // half-height of the white centre band
  return (
    <g transform={`translate(${x} ${y})`}>
      <title>{air ? "Limited quantity Y mark" : "Limited quantity mark"}</title>
      <polygon points={`${c},0 ${size},${c} ${c},${size} 0,${c}`} fill="#000" />
      <polygon points={`${b},${c - b} ${size - b},${c - b} ${size},${c} ${size - b},${c + b} ${b},${c + b} 0,${c}`} fill="#fff" />
      <polygon points={`${c},0 ${size},${c} ${c},${size} 0,${c}`} fill="none" stroke="#000" strokeWidth="1.5" />
      {air && (
        <text x={c} y={c + size * 0.12} textAnchor="middle" fontSize={size * 0.34} fontWeight="800">
          Y
        </text>
      )}
    </g>
  );
};

/** Two up-arrows over a bar, inside a border (package orientation marking). */
const Arrows = ({ x, y, w }) => {
  const h = w * 0.9;
  const arrow = (cx) => (
    <path
      d={`M${cx} ${y + 6} l${w * 0.16} ${h * 0.28} h${-w * 0.09} v${h * 0.4} h${-w * 0.14} v${-h * 0.4} h${-w * 0.09} z`}
      fill="#000"
    />
  );
  return (
    <g>
      <title>Orientation arrows</title>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="#000" strokeWidth="1.2" />
      {arrow(x + w * 0.3)}
      {arrow(x + w * 0.7)}
      <rect x={x + w * 0.12} y={y + h * 0.8} width={w * 0.76} height={h * 0.07} fill="#000" />
    </g>
  );
};

const TextBox = ({ x, y, text, title, size = 9, bold = true }) => {
  const w = text.length * size * 0.62 + 10;
  return (
    <g>
      <title>{title || text}</title>
      <rect x={x} y={y} width={w} height={size + 8} fill="#fff" stroke="#000" strokeWidth="1" />
      <text x={x + 5} y={y + size + 2.5} fontSize={size} fontWeight={bold ? 700 : 400}>
        {text}
      </text>
    </g>
  );
};

const AddressCard = ({ x, y, w, h, n }) => (
  <g>
    <title>Shipper and consignee name and address</title>
    <rect x={x} y={y} width={w} height={h} fill="#fff" stroke="#8a8a8a" />
    <text x={x + 5} y={y + 11} fontSize="7" fontWeight="700">
      FROM:
    </text>
    {[0, 1].map((i) => (
      <rect key={`f${i}`} x={x + 30} y={y + 6 + i * 7} width={w - 38 - i * 12} height="2.5" fill="#9aa1aa" />
    ))}
    <text x={x + 5} y={y + h / 2 + 10} fontSize="7" fontWeight="700">
      TO:
    </text>
    {[0, 1, 2].map((i) => (
      <rect key={`t${i}`} x={x + 30} y={y + h / 2 + 5 + i * 7} width={w - 38 - (i % 2) * 14} height="2.5" fill="#9aa1aa" />
    ))}
    <Callout n={n} x={x + w - 2} y={y + 2} />
  </g>
);

const MATERIALS = {
  fiberboard: { front: "#d8ae74", side: "#c39657", top: "#e5c28f", edge: "#8a6a3c", tape: "#c9a46a" },
  wood: { front: "#c8945a", side: "#a8773f", top: "#d9a96d", edge: "#6e4a22", tape: null },
  plastic: { front: "#3d6fb6", side: "#2f5b97", top: "#5a8ad0", edge: "#1f3f6e", tape: null },
  steel: { front: "#5b7fa6", side: "#4a6b8f", top: "#7d9cc0", edge: "#2d4560", tape: null },
  fiber: { front: "#b98b55", side: "#9b7243", top: "#cfa26b", edge: "#6b4a25", tape: null },
};

/**
 * Shipping name, address, labels and the small text marks laid out on a flat face
 * (x0, y0, W, H). `narrow` (a drum or jerrican) stacks the address under the labels.
 */
function Front({ plan, num, air, x0, y0, W, H, narrow }) {
  const marks = Object.fromEntries(plan.marks.map((m) => [m.key, m]));
  const hazard = plan.labels.filter((l) => l.code && l.code !== "CAO");
  const cao = plan.labels.find((l) => l.code === "CAO");
  const psn = marks.psn;
  const rq = psn.text.startsWith("RQ ");
  const [idNo, ...rest] = psn.text.replace(/^RQ /, "").split(" ");
  const max = narrow ? 26 : 20;
  const all = wrap(rest.join(" "), max);
  const lines = all.slice(0, 3);
  if (all.length > 3) lines[2] = `${lines[2].slice(0, max - 2)}…`;

  const n = hazard.length + (cao ? 1 : 0) + (marks.lq ? 1 : 0);
  const size = Math.min(narrow ? 62 : 78, (W - 24 - 8 * Math.max(0, n - 1)) / Math.max(1, n));
  const ly = y0 + (narrow ? 72 : 82);
  const row = [];
  let lx = x0 + 12;
  hazard.forEach((l) => {
    const x = lx;
    row.push(
      <g key={l.key}>
        <HazardLabel code={l.code} x={x} y={ly} size={size} />
        <Callout n={num[l.key]} x={x + 4} y={ly + 4} />
      </g>
    );
    lx += size + 8;
  });
  if (cao) {
    const x = lx;
    row.push(
      <g key="cao">
        <CaoLabel x={x} y={ly + size * 0.05} w={size} />
        <Callout n={num.cao} x={x + 2} y={ly + 2} />
      </g>
    );
    lx += size + 8;
  }
  if (marks.lq) {
    const x = lx;
    row.push(
      <g key="lq">
        <LqMark x={x} y={ly} size={size} air={air} />
        <Callout n={num.lq} x={x + 4} y={ly + 4} />
      </g>
    );
  }

  // small marks along the bottom, wrapping upward when a row is full
  const small = [];
  if (marks.spec) small.push({ key: "spec", w: 22 + marks.spec.text.length * 5.2 });
  ["airEligible", "inhalation", "heat"].forEach((key) => marks[key] && small.push({ key, w: marks[key].text.length * 9 * 0.62 + 10 }));
  const placed = [];
  let bx = x0 + 12;
  let by = y0 + H - 28;
  small.forEach((m) => {
    if (bx + m.w > x0 + W - 8 && bx > x0 + 12) {
      bx = x0 + 12;
      by -= 24;
    }
    placed.push({ ...m, x: bx, y: by });
    bx += m.w + 12;
  });

  return (
    <g>
      <g>
        <title>{psn.text}</title>
        {rq && (
          <text x={x0 + 18} y={y0 + 22} fontSize="15" fontWeight="800">
            RQ
          </text>
        )}
        <text x={x0 + 18 + (rq ? 30 : 0)} y={y0 + 22} fontSize="17" fontWeight="800">
          {idNo}
        </text>
        {lines.map((l, i) => (
          <text key={i} x={x0 + 18} y={y0 + 37 + i * 12} fontSize="10.5" fontWeight="700">
            {l}
          </text>
        ))}
        <Callout n={num.psn} x={x0 + 8} y={y0 + 8} />
      </g>

      {marks.address &&
        (narrow ? (
          <AddressCard x={x0 + 12} y={ly + size + 8} w={102} h={46} n={num.address} />
        ) : (
          <AddressCard x={x0 + W - 112} y={y0 + 10} w={102} h={50} n={num.address} />
        ))}

      {row}

      {placed.map((m) =>
        m.key === "spec" ? (
          <g key="spec">
            <title>{marks.spec.detail}</title>
            <circle cx={m.x + 9} cy={m.y + 9} r="9" fill="none" stroke="#000" strokeWidth="1.2" />
            <text x={m.x + 9} y={m.y + 8} textAnchor="middle" fontSize="6.5" fontWeight="700">
              u
            </text>
            <text x={m.x + 9} y={m.y + 14} textAnchor="middle" fontSize="6.5" fontWeight="700">
              n
            </text>
            <text x={m.x + 22} y={m.y + 12} fontSize="8.5" fontFamily="monospace">
              {marks.spec.text}
            </text>
            <Callout n={num.spec} x={m.x} y={m.y - 2} />
          </g>
        ) : (
          <g key={m.key}>
            <TextBox x={m.x} y={m.y + 1} text={marks[m.key].text} title={marks[m.key].detail} />
            <Callout n={num[m.key]} x={m.x + m.w} y={m.y} />
          </g>
        )
      )}
    </g>
  );
}

function Box({ plan, num, air }) {
  const x0 = 24;
  const y0 = 104;
  const W = 270;
  const H = 210;
  const dx = 104;
  const dy = -64;
  const k = dy / dx;
  const c = MATERIALS[plan.container.material] || MATERIALS.fiberboard;
  const arrows = plan.marks.find((m) => m.key === "arrows");
  return (
    <g>
      <polygon points={`${x0},${y0} ${x0 + dx},${y0 + dy} ${x0 + W + dx},${y0 + dy} ${x0 + W},${y0}`} fill={c.top} stroke={c.edge} />
      {c.tape && (
        <polygon
          points={`${x0 + W / 2 - 14},${y0} ${x0 + W / 2 - 14 + dx},${y0 + dy} ${x0 + W / 2 + 14 + dx},${y0 + dy} ${x0 + W / 2 + 14},${y0}`}
          fill={c.tape}
          opacity="0.8"
        />
      )}
      {plan.container.material === "wood" &&
        [1, 2, 3].map((i) => (
          <line key={i} x1={x0} y1={y0 + (H / 4) * i} x2={x0 + W} y2={y0 + (H / 4) * i} stroke={c.edge} strokeOpacity="0.35" />
        ))}
      <polygon points={`${x0 + W},${y0} ${x0 + W + dx},${y0 + dy} ${x0 + W + dx},${y0 + H + dy} ${x0 + W},${y0 + H}`} fill={c.side} stroke={c.edge} />
      <rect x={x0} y={y0} width={W} height={H} fill={c.front} stroke={c.edge} />
      {plan.container.material === "wood" &&
        [1, 2, 3].map((i) => (
          <line key={i} x1={x0} y1={y0 + (H / 4) * i} x2={x0 + W} y2={y0 + (H / 4) * i} stroke={c.edge} strokeOpacity="0.35" />
        ))}
      <Front plan={plan} num={num} air={air} x0={x0} y0={y0} W={W} H={H} />
      {arrows && (
        <g transform={`matrix(1 ${k} 0 1 ${x0 + W} ${y0})`}>
          <Arrows x={dx / 2 - 30} y={40} w={60} />
          <Callout n={num.arrows} x={dx / 2 - 30} y={38} />
        </g>
      )}
    </g>
  );
}

/** Drum seen from slightly above: lid ellipse, body with two rolling hoops. */
function Drum({ plan, num, air }) {
  const cx = 200;
  const bw = 236;
  const x0 = cx - bw / 2;
  const top = 46;
  const bottom = 322;
  const ry = 18;
  const c = MATERIALS[plan.container.material] || MATERIALS.steel;
  const openHead = plan.container.code.endsWith("2");
  const arrows = plan.marks.find((m) => m.key === "arrows");
  const id = `drum-${plan.container.material}`;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor={c.side} />
          <stop offset="0.35" stopColor={c.top} />
          <stop offset="1" stopColor={c.side} />
        </linearGradient>
      </defs>
      <path d={`M${x0} ${top} V${bottom} A${bw / 2} ${ry} 0 0 0 ${x0 + bw} ${bottom} V${top}`} fill={`url(#${id})`} stroke={c.edge} />
      {[0.36, 0.7].map((f) => (
        <path key={f} d={`M${x0} ${top + (bottom - top) * f} A${bw / 2} ${ry} 0 0 0 ${x0 + bw} ${top + (bottom - top) * f}`} fill="none" stroke={c.edge} strokeWidth="3" strokeOpacity="0.55" />
      ))}
      <ellipse cx={cx} cy={top} rx={bw / 2} ry={ry} fill={c.top} stroke={c.edge} />
      {openHead ? (
        <ellipse cx={cx} cy={top} rx={bw / 2 - 4} ry={ry - 3} fill="none" stroke={c.edge} strokeWidth="4" strokeOpacity="0.7">
          <title>Removable lid with a closing ring</title>
        </ellipse>
      ) : (
        <g>
          <title>Closed head with bungs</title>
          <ellipse cx={cx - 60} cy={top + 2} rx="11" ry="5" fill={c.side} stroke={c.edge} />
          <ellipse cx={cx + 66} cy={top + 1} rx="7" ry="3.5" fill={c.side} stroke={c.edge} />
        </g>
      )}
      <rect x={x0 + 14} y={top + 26} width={bw - 28} height={bottom - top - 40} rx="6" fill="#fff" fillOpacity="0.12" />
      <Front plan={plan} num={num} air={air} x0={x0 + 10} y0={top + 24} W={bw - 20} H={bottom - top - 30} narrow />
      {arrows && (
        <g>
          <Arrows x={x0 + bw - 58} y={bottom - 78} w={38} />
          <Callout n={num.arrows} x={x0 + bw - 58} y={bottom - 80} />
        </g>
      )}
    </g>
  );
}

/** Jerrican: flat front with a three-hole handle and a spout. */
function Jerrican({ plan, num, air }) {
  const x0 = 82;
  const W = 236;
  const top = 64;
  const bottom = 326;
  const c = MATERIALS[plan.container.material] || MATERIALS.plastic;
  return (
    <g>
      <rect x={x0 + W - 70} y={top - 34} width="26" height="30" rx="4" fill={c.side} stroke={c.edge}>
        <title>Spout with screw cap</title>
      </rect>
      <path d={`M${x0 + 20} ${top} V${top - 30} H${x0 + 140} V${top}`} fill={c.side} stroke={c.edge} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={x0 + 30 + i * 37} y={top - 24} width="26" height="16" rx="6" fill="#eef2f7" stroke={c.edge} />
      ))}
      <rect x={x0} y={top} width={W} height={bottom - top} rx="16" fill={c.front} stroke={c.edge} />
      <rect x={x0 + 10} y={top + 10} width={W - 20} height={bottom - top - 20} rx="10" fill="none" stroke={c.edge} strokeOpacity="0.4" />
      <Front plan={plan} num={num} air={air} x0={x0 + 6} y0={top + 8} W={W - 12} H={bottom - top - 14} narrow />
    </g>
  );
}

function Cylinder({ plan, num }) {
  const cx = 200;
  const bw = 150; // body width
  const top = 118;
  const bottom = 330;
  const marks = Object.fromEntries(plan.marks.map((m) => [m.key, m]));
  const hazard = plan.labels.filter((l) => l.code && l.code !== "CAO");
  const cao = plan.labels.find((l) => l.code === "CAO");
  const psn = marks.psn;
  const [idNo, ...rest] = psn.text.replace(/^RQ /, "").split(" ");
  const lines = wrap(rest.join(" "), 20).slice(0, 3);
  const size = Math.min(52, (bw - 10) / Math.max(1, hazard.length));
  return (
    <g>
      <defs>
        <linearGradient id="pkg-steel" x1="0" x2="1">
          <stop offset="0" stopColor="#7d8894" />
          <stop offset="0.35" stopColor="#c9d1d9" />
          <stop offset="1" stopColor="#6b7580" />
        </linearGradient>
      </defs>
      {/* valve cap and neck */}
      <rect x={cx - 22} y="22" width="44" height="40" rx="8" fill="url(#pkg-steel)" stroke="#4b5563" />
      <rect x={cx - 15} y="60" width="30" height="16" fill="url(#pkg-steel)" stroke="#4b5563" />
      {/* shoulder and body */}
      <path
        d={`M${cx - bw / 2} ${top} Q${cx - bw / 2} 76 ${cx - 15} 76 H${cx + 15} Q${cx + bw / 2} 76 ${cx + bw / 2} ${top} V${bottom - 10} Q${cx + bw / 2} ${bottom} ${cx + bw / 2 - 10} ${bottom} H${cx - bw / 2 + 10} Q${cx - bw / 2} ${bottom} ${cx - bw / 2} ${bottom - 10} Z`}
        fill="url(#pkg-steel)"
        stroke="#4b5563"
      />
      {marks.spec && (
        <g>
          <title>{marks.spec.detail}</title>
          <text x={cx} y="72" textAnchor="middle" fontSize="6" fontFamily="monospace" fill="#1f2933">
            DOT-3AA ···· / RETEST
          </text>
          <Callout n={num.spec} x={cx + 30} y={66} />
        </g>
      )}
      {/* labels on the shoulder */}
      {hazard.map((l, i) => {
        const x = cx - (hazard.length * size) / 2 + i * size;
        return (
          <g key={l.key}>
            <HazardLabel code={l.code} x={x} y={86} size={size} />
            <Callout n={num[l.key]} x={x + 4} y={90} />
          </g>
        );
      })}
      {/* shipping name tag */}
      <g>
        <title>{psn.text}</title>
        <rect x={cx - bw / 2 + 12} y={150} width={bw - 24} height={20 + lines.length * 11} fill="#fff" stroke="#000" />
        <text x={cx} y={164} textAnchor="middle" fontSize="13" fontWeight="800">
          {psn.text.startsWith("RQ ") ? "RQ " : ""}
          {idNo}
        </text>
        {lines.map((l, i) => (
          <text key={i} x={cx} y={177 + i * 11} textAnchor="middle" fontSize="9" fontWeight="700">
            {l}
          </text>
        ))}
        <Callout n={num.psn} x={cx - bw / 2 + 12} y={150} />
      </g>
      {marks.address && <AddressCard x={cx - 51} y={214} w={102} h={50} n={num.address} />}
      {cao && (
        <g>
          <CaoLabel x={cx - 30} y={270} w={60} />
          <Callout n={num.cao} x={cx - 30} y={270} />
        </g>
      )}
      {marks.inhalation && (
        <g>
          <TextBox x={cx - 56} y={cao ? 228 + 0 : 274} text="INHALATION HAZARD" title={marks.inhalation.detail} />
          <Callout n={num.inhalation} x={cx - 56} y={cao ? 228 : 274} />
        </g>
      )}
    </g>
  );
}

/** numbering: marks first, then labels, in list order */
export const calloutNumbers = (plan) => {
  const num = {};
  let i = 1;
  plan.marks.forEach((m) => (num[m.key] = i++));
  plan.labels.forEach((l) => (num[l.key] = i++));
  return num;
};

const PackageDrawing = ({ plan, item, air }) => {
  const num = calloutNumbers(plan);
  return (
    <svg
      className="pkg-drawing"
      viewBox="0 0 400 340"
      role="img"
      aria-label={`Illustration of the ${plan.shape === "box" ? "package" : plan.shape} for ${item.un} ${item.name} with its markings and labels`}
    >
      {plan.shape === "cylinder" ? (
        <Cylinder plan={plan} num={num} />
      ) : plan.shape === "drum" ? (
        <Drum plan={plan} num={num} air={air} />
      ) : plan.shape === "jerrican" ? (
        <Jerrican plan={plan} num={num} air={air} />
      ) : (
        <Box plan={plan} num={num} air={air} />
      )}
    </svg>
  );
};

export default PackageDrawing;
