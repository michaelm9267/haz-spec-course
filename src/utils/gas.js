// Compressed-gas cylinder math (ideal gas law with an optional compressibility factor Z).

export const ATM_KPA = 101.325;
const R = 8.314462618; // J/(mol·K) = kPa·L/(mol·K)

export const VOLUME_UNITS = {
  L: { label: "liters (L)", toLiters: 1 },
  gal: { label: "US gallons", toLiters: 3.785411784 },
  ft3: { label: "cubic feet (ft³)", toLiters: 28.316846592 },
  in3: { label: "cubic inches (in³)", toLiters: 0.016387064 },
  lbw: { label: "lb of water", toLiters: 0.45359237 }, // 1 kg of water ≈ 1 L
};

export const PRESSURE_UNITS = {
  psig: { label: "psig", toKpa: 6.894757293 },
  bar: { label: "bar (gauge)", toKpa: 100 },
  kPa: { label: "kPa (gauge)", toKpa: 1 },
  MPa: { label: "MPa (gauge)", toKpa: 1000 },
};

// Molar mass (g/mol) for gases by UN number. "liquefied" gases are filled by weight, so the
// pressure/volume estimate doesn't apply to them; the molar mass is kept for reference.
export const GAS_DATA = {
  UN1002: { name: "Air", molarMass: 28.96 },
  UN1006: { name: "Argon", molarMass: 39.948 },
  UN1008: { name: "Boron trifluoride", molarMass: 67.82 },
  UN1016: { name: "Carbon monoxide", molarMass: 28.01 },
  UN1045: { name: "Fluorine", molarMass: 37.997 },
  UN1046: { name: "Helium", molarMass: 4.0026 },
  UN1049: { name: "Hydrogen", molarMass: 2.016 },
  UN1056: { name: "Krypton", molarMass: 83.798 },
  UN1065: { name: "Neon", molarMass: 20.18 },
  UN1066: { name: "Nitrogen", molarMass: 28.014 },
  UN1072: { name: "Oxygen", molarMass: 31.998 },
  UN1660: { name: "Nitric oxide", molarMass: 30.006 },
  UN1859: { name: "Silicon tetrafluoride", molarMass: 104.08 },
  UN1957: { name: "Deuterium", molarMass: 4.028 },
  UN1962: { name: "Ethylene", molarMass: 28.054 },
  UN1971: { name: "Methane / natural gas", molarMass: 16.043 },
  UN2036: { name: "Xenon", molarMass: 131.29 },
  UN2451: { name: "Nitrogen trifluoride", molarMass: 71.0 },
  UN1001: { name: "Acetylene", molarMass: 26.038, state: "dissolved" },
  UN1005: { name: "Ammonia", molarMass: 17.031, state: "liquefied" },
  UN1011: { name: "Butane", molarMass: 58.12, state: "liquefied" },
  UN1013: { name: "Carbon dioxide", molarMass: 44.01, state: "liquefied" },
  UN1017: { name: "Chlorine", molarMass: 70.9, state: "liquefied" },
  UN1018: { name: "Chlorodifluoromethane (R22)", molarMass: 86.47, state: "liquefied" },
  UN1040: { name: "Ethylene oxide", molarMass: 44.05, state: "liquefied" },
  UN1050: { name: "Hydrogen chloride", molarMass: 36.46, state: "liquefied" },
  UN1053: { name: "Hydrogen sulfide", molarMass: 34.08, state: "liquefied" },
  UN1070: { name: "Nitrous oxide", molarMass: 44.013, state: "liquefied" },
  UN1077: { name: "Propylene", molarMass: 42.08, state: "liquefied" },
  UN1079: { name: "Sulfur dioxide", molarMass: 64.066, state: "liquefied" },
  UN1080: { name: "Sulfur hexafluoride", molarMass: 146.06, state: "liquefied" },
  UN1978: { name: "Propane", molarMass: 44.097, state: "liquefied" },
  UN3159: { name: "1,1,1,2-Tetrafluoroethane (R134a)", molarMass: 102.03, state: "liquefied" },
};

/**
 * How a Class 2 entry is filled: "compressed" (this calculator applies), "liquefied",
 * "refrigerated", "dissolved", "article" (aerosols, cartridges, etc.) or undefined (unknown).
 */
export function gasState(item) {
  const n = item.name.toUpperCase();
  if (/REFRIGERATED|CRYOGENIC/.test(n)) return "refrigerated";
  if (/AEROSOL|CARTRIDGE|RECEPTACLES?, SMALL|LIGHTER|FIRE EXTINGUISHER|ARTICLES?/.test(n)) return "article";
  if (/DISSOLVED|ADSORBED/.test(n)) return "dissolved";
  if (/LIQUEFIED/.test(n)) return "liquefied";
  if (/COMPRESSED/.test(n)) return "compressed";
  return GAS_DATA[item.un]?.state || (GAS_DATA[item.un] ? "compressed" : undefined);
}

// Common US cylinder types. Water capacities are typical values (they vary by manufacturer and
// are stamped on each cylinder); fill is the usual full pressure in psig. Medical aluminum sizes
// are derived from their rated oxygen contents. Liquefied-gas cylinders are filled by weight, so
// they carry the nominal net contents (lb) instead.
export const CYLINDERS = [
  { id: "lecture", group: "Laboratory", label: "Lecture bottle", spec: "DOT-3E1800", wc: 0.44, unit: "L", fill: 1800 },

  { id: "t300", group: "Industrial (steel)", label: "Size 300 / T", spec: "DOT-3AA2400", wc: 49.9, unit: "L", fill: 2640, plus: true, rated: "≈ 300 ft³ nitrogen" },
  { id: "k200", group: "Industrial (steel)", label: "Size 200 / K", spec: "DOT-3AA2015", wc: 43.8, unit: "L", fill: 2216, plus: true, rated: "≈ 200 ft³ nitrogen" },
  { id: "s125", group: "Industrial (steel)", label: "Size 125", spec: "DOT-3AA2015", wc: 23.3, unit: "L", fill: 2216, plus: true, rated: "≈ 125 ft³ nitrogen" },
  { id: "q80", group: "Industrial (steel)", label: "Size 80", spec: "DOT-3AA2015", wc: 14.9, unit: "L", fill: 2216, plus: true, rated: "≈ 80 ft³ nitrogen" },
  { id: "s40", group: "Industrial (steel)", label: "Size 40", spec: "DOT-3AA2015", wc: 7.5, unit: "L", fill: 2216, plus: true, rated: "≈ 40 ft³ nitrogen" },

  { id: "m6", group: "Medical (aluminum)", label: "M6", spec: "DOT-3AL2015", wc: 1.13, unit: "L", fill: 2015, rated: "165 L oxygen" },
  { id: "m9", group: "Medical (aluminum)", label: "C / M9", spec: "DOT-3AL2015", wc: 1.71, unit: "L", fill: 2015, rated: "248 L oxygen" },
  { id: "d", group: "Medical (aluminum)", label: "D / M15", spec: "DOT-3AL2015", wc: 2.92, unit: "L", fill: 2015, rated: "425 L oxygen" },
  { id: "e", group: "Medical (aluminum)", label: "E / M24", spec: "DOT-3AL2015", wc: 4.68, unit: "L", fill: 2015, rated: "680 L oxygen" },
  { id: "m60", group: "Medical (aluminum)", label: "M60", spec: "DOT-3AL2015", wc: 11.3, unit: "L", fill: 2015, rated: "1,640 L oxygen" },
  { id: "m90", group: "Medical (aluminum)", label: "M90", spec: "DOT-3AL2015", wc: 17.5, unit: "L", fill: 2015, rated: "2,550 L oxygen" },
  { id: "m122", group: "Medical (aluminum)", label: "M / M122", spec: "DOT-3AL2015", wc: 23.8, unit: "L", fill: 2015, rated: "3,455 L oxygen" },
  { id: "h", group: "Medical (aluminum)", label: "H (steel)", spec: "DOT-3AA2015", wc: 43.5, unit: "L", fill: 2216, plus: true, rated: "6,900 L oxygen" },

  { id: "al80", group: "Breathing air", label: "SCUBA AL80", spec: "DOT-3AL3000", wc: 11.1, unit: "L", fill: 3000, rated: "77.4 ft³ air" },

  { id: "p20", group: "Liquefied (filled by weight)", label: "Propane 20 lb (grill)", spec: "DOT-4BA240", wc: 47.6, unit: "lbw", fill: 240, netLb: 20 },
  { id: "p33", group: "Liquefied (filled by weight)", label: "Propane 33.5 lb (forklift)", spec: "DOT-4BW240", wc: 80, unit: "lbw", fill: 240, netLb: 33.5 },
  { id: "p100", group: "Liquefied (filled by weight)", label: "Propane 100 lb", spec: "DOT-4BW240", wc: 239, unit: "lbw", fill: 240, netLb: 100 },
  { id: "co2_20", group: "Liquefied (filled by weight)", label: "CO₂ 20 lb", spec: "DOT-3AA1800", wc: 29.4, unit: "lbw", fill: 1800, netLb: 20 },
  { id: "co2_50", group: "Liquefied (filled by weight)", label: "CO₂ 50 lb", spec: "DOT-3AA1800", wc: 73.5, unit: "lbw", fill: 1800, netLb: 50 },
];

export const fToC = (f) => ((f - 32) * 5) / 9;

/**
 * @param {object} p
 * @param {number} p.waterCapacity  cylinder internal volume, in volumeUnit
 * @param {string} p.volumeUnit     key of VOLUME_UNITS
 * @param {number} p.pressure       fill (gauge) pressure, in pressureUnit
 * @param {string} p.pressureUnit   key of PRESSURE_UNITS
 * @param {number} p.tempC          gas temperature, °C
 * @param {number} [p.z=1]          compressibility factor
 * @param {number} [p.molarMass]    g/mol; omit for volume only
 */
export function cylinderContents({ waterCapacity, volumeUnit, pressure, pressureUnit, tempC, z = 1, molarMass }) {
  const wcL = waterCapacity * VOLUME_UNITS[volumeUnit].toLiters;
  const gaugeKpa = pressure * PRESSURE_UNITS[pressureUnit].toKpa;
  const absKpa = gaugeKpa + ATM_KPA;
  const tempK = tempC + 273.15;
  if (!(wcL > 0) || !(absKpa > 0) || !(tempK > 0) || !(z > 0)) return null;

  // Free gas volume: expand the cylinder contents to 1 atm at the same temperature.
  const freeGasL = (wcL * absKpa) / ATM_KPA / z;
  const moles = (absKpa * wcL) / (z * R * tempK);
  const massKg = molarMass > 0 ? (moles * molarMass) / 1000 : null;

  return {
    waterCapacityL: wcL,
    absPressureKpa: absKpa,
    absPressurePsia: absKpa / PRESSURE_UNITS.psig.toKpa,
    freeGasL,
    freeGasFt3: freeGasL / VOLUME_UNITS.ft3.toLiters,
    moles,
    massKg,
    massLb: massKg === null ? null : massKg / 0.45359237,
  };
}
