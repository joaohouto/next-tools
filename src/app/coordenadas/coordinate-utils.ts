import type { Coordinate, DMSComponent, DMSCoordinate, UTMCoordinate } from "./types";

// ---------- Decimal (DD) <-> Graus/Minutos/Segundos (DMS) ----------

function toDMSComponent(value: number, positiveDir: "N" | "E", negativeDir: "S" | "W"): DMSComponent {
  const dir = value >= 0 ? positiveDir : negativeDir;
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = (minFloat - min) * 60;
  return { deg, min, sec, dir };
}

function dmsComponentToDecimal(c: DMSComponent): number {
  const value = c.deg + c.min / 60 + c.sec / 3600;
  return c.dir === "S" || c.dir === "W" ? -value : value;
}

export function ddToDms(coord: Coordinate): DMSCoordinate {
  return {
    lat: toDMSComponent(coord.lat, "N", "S"),
    lng: toDMSComponent(coord.lng, "E", "W"),
  };
}

export function dmsToDd(dms: DMSCoordinate): Coordinate {
  return {
    lat: dmsComponentToDecimal(dms.lat),
    lng: dmsComponentToDecimal(dms.lng),
  };
}

export function formatDMS(dms: DMSCoordinate): string {
  const fmt = (c: DMSComponent) =>
    `${c.deg}°${String(c.min).padStart(2, "0")}'${c.sec.toFixed(1).padStart(4, "0")}"${c.dir}`;
  return `${fmt(dms.lat)} ${fmt(dms.lng)}`;
}

const DMS_COMPONENT_REGEX = /(\d+(?:\.\d+)?)[°\s]+(\d+(?:\.\d+)?)['′\s]+(\d+(?:\.\d+)?)["″]?\s*([NSEWnsew])/g;

export function parseDMSString(input: string): Coordinate | null {
  const matches = [...input.matchAll(DMS_COMPONENT_REGEX)];
  if (matches.length < 2) return null;

  const components = matches.map((m) => ({
    deg: parseFloat(m[1]),
    min: parseFloat(m[2]),
    sec: parseFloat(m[3]),
    dir: m[4].toUpperCase() as DMSComponent["dir"],
  }));

  const latComp = components.find((c) => c.dir === "N" || c.dir === "S");
  const lngComp = components.find((c) => c.dir === "E" || c.dir === "W");
  if (!latComp || !lngComp) return null;

  return dmsToDd({ lat: latComp, lng: lngComp });
}

// ---------- Decimal (DD) <-> UTM ----------
// Implementação clássica de Transverse Mercator (elipsoide WGS84), baseada
// nas séries fechadas de Snyder/USGS amplamente usadas em conversores UTM
// leves (equivalente ao que libs como `utm`/`proj4` fazem internamente).

const WGS84_A = 6378137.0;
const WGS84_B = 6356752.314245;
const UTM_SCALE_FACTOR = 0.9996;

function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function rad2deg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function arcLengthOfMeridian(phi: number): number {
  const n = (WGS84_A - WGS84_B) / (WGS84_A + WGS84_B);
  const alpha = ((WGS84_A + WGS84_B) / 2) * (1 + n ** 2 / 4 + n ** 4 / 64);
  const beta = (-3 * n) / 2 + (9 * n ** 3) / 16 - (3 * n ** 5) / 32;
  const gamma = (15 * n ** 2) / 16 - (15 * n ** 4) / 32;
  const delta = (-35 * n ** 3) / 48 + (105 * n ** 5) / 256;
  const epsilon = (315 * n ** 4) / 512;

  return alpha * (
    phi +
    beta * Math.sin(2 * phi) +
    gamma * Math.sin(4 * phi) +
    delta * Math.sin(6 * phi) +
    epsilon * Math.sin(8 * phi)
  );
}

function utmCentralMeridian(zone: number): number {
  return deg2rad(-183 + zone * 6);
}

function footpointLatitude(y: number): number {
  const n = (WGS84_A - WGS84_B) / (WGS84_A + WGS84_B);
  const alphaF = ((WGS84_A + WGS84_B) / 2) * (1 + n ** 2 / 4 + n ** 4 / 64);
  const yF = y / alphaF;
  const betaF = (3 * n) / 2 - (27 * n ** 3) / 32 + (269 * n ** 5) / 512;
  const gammaF = (21 * n ** 2) / 16 - (55 * n ** 4) / 32;
  const deltaF = (151 * n ** 3) / 96 - (417 * n ** 5) / 128;
  const epsilonF = (1097 * n ** 4) / 512;

  return (
    yF +
    betaF * Math.sin(2 * yF) +
    gammaF * Math.sin(4 * yF) +
    deltaF * Math.sin(6 * yF) +
    epsilonF * Math.sin(8 * yF)
  );
}

function latLonToXY(phi: number, lambda: number, lambda0: number): { x: number; y: number } {
  const ep2 = (WGS84_A ** 2 - WGS84_B ** 2) / WGS84_B ** 2;
  const nu2 = ep2 * Math.cos(phi) ** 2;
  const N = WGS84_A ** 2 / (WGS84_B * Math.sqrt(1 + nu2));
  const t = Math.tan(phi);
  const t2 = t * t;
  const l = lambda - lambda0;

  const l3coef = 1 - t2 + nu2;
  const l4coef = 5 - t2 + 9 * nu2 + 4 * nu2 ** 2;
  const l5coef = 5 - 18 * t2 + t2 ** 2 + 14 * nu2 - 58 * t2 * nu2;
  const l6coef = 61 - 58 * t2 + t2 ** 2 + 270 * nu2 - 330 * t2 * nu2;
  const l7coef = 61 - 479 * t2 + 179 * t2 ** 2 - t2 ** 3;
  const l8coef = 1385 - 3111 * t2 + 543 * t2 ** 2 - t2 ** 3;

  const x =
    N * Math.cos(phi) * l +
    (N / 6) * Math.cos(phi) ** 3 * l3coef * l ** 3 +
    (N / 120) * Math.cos(phi) ** 5 * l5coef * l ** 5 +
    (N / 5040) * Math.cos(phi) ** 7 * l7coef * l ** 7;

  const y =
    arcLengthOfMeridian(phi) +
    (t / 2) * N * Math.cos(phi) ** 2 * l ** 2 +
    (t / 24) * N * Math.cos(phi) ** 4 * l4coef * l ** 4 +
    (t / 720) * N * Math.cos(phi) ** 6 * l6coef * l ** 6 +
    (t / 40320) * N * Math.cos(phi) ** 8 * l8coef * l ** 8;

  return { x, y };
}

function xyToLatLon(x: number, y: number, lambda0: number): { lat: number; lon: number } {
  const phiF = footpointLatitude(y);
  const ep2 = (WGS84_A ** 2 - WGS84_B ** 2) / WGS84_B ** 2;
  const cf = Math.cos(phiF);
  const nuf2 = ep2 * cf ** 2;
  const Nf = WGS84_A ** 2 / (WGS84_B * Math.sqrt(1 + nuf2));
  const tf = Math.tan(phiF);
  const tf2 = tf * tf;
  const tf4 = tf2 * tf2;

  const Nf2 = Nf * Nf;
  const Nf3 = Nf2 * Nf;
  const Nf4 = Nf3 * Nf;
  const Nf5 = Nf4 * Nf;
  const Nf6 = Nf5 * Nf;
  const Nf7 = Nf6 * Nf;
  const Nf8 = Nf7 * Nf;

  const x1frac = 1 / (Nf * cf);
  const x2frac = tf / (2 * Nf2);
  const x3frac = 1 / (6 * Nf3 * cf);
  const x4frac = tf / (24 * Nf4);
  const x5frac = 1 / (120 * Nf5 * cf);
  const x6frac = tf / (720 * Nf6);
  const x7frac = 1 / (5040 * Nf7 * cf);
  const x8frac = tf / (40320 * Nf8);

  const x2poly = -1 - nuf2;
  const x3poly = -1 - 2 * tf2 - nuf2;
  const x4poly = 5 + 3 * tf2 + 6 * nuf2 - 6 * tf2 * nuf2 - 3 * nuf2 ** 2 - 9 * tf2 * nuf2 ** 2;
  const x5poly = 5 + 28 * tf2 + 24 * tf4 + 6 * nuf2 + 8 * tf2 * nuf2;
  const x6poly = -61 - 90 * tf2 - 45 * tf4 - 107 * nuf2 + 162 * tf2 * nuf2;
  const x7poly = -61 - 662 * tf2 - 1320 * tf4 - 720 * tf4 * tf2;
  const x8poly = 1385 + 3633 * tf2 + 4095 * tf4 + 1575 * tf4 * tf2;

  const lat =
    phiF +
    x2frac * x2poly * x ** 2 +
    x4frac * x4poly * x ** 4 +
    x6frac * x6poly * x ** 6 +
    x8frac * x8poly * x ** 8;

  const lon =
    lambda0 +
    x1frac * x +
    x3frac * x3poly * x ** 3 +
    x5frac * x5poly * x ** 5 +
    x7frac * x7poly * x ** 7;

  return { lat, lon };
}

function utmZoneNumber(lng: number): number {
  return Math.min(60, Math.max(1, Math.floor((lng + 180) / 6) + 1));
}

// Faixas de 8° de C a X (sem I/O), com X estendida até 84°N — não trata as
// exceções pontuais de Noruega/Svalbard, aceitável para este escopo.
const UTM_BANDS = "CDEFGHJKLMNPQRSTUVWX";

function utmBandLetter(lat: number): string {
  if (lat < -80 || lat > 84) return "Z";
  const idx = Math.min(Math.floor((lat + 80) / 8), UTM_BANDS.length - 1);
  return UTM_BANDS[idx];
}

export function ddToUtm(coord: Coordinate): UTMCoordinate {
  const zone = utmZoneNumber(coord.lng);
  const lambda0 = utmCentralMeridian(zone);
  const { x, y } = latLonToXY(deg2rad(coord.lat), deg2rad(coord.lng), lambda0);

  const easting = x * UTM_SCALE_FACTOR + 500000;
  const hemisphere: "N" | "S" = coord.lat < 0 ? "S" : "N";
  let northing = y * UTM_SCALE_FACTOR;
  if (hemisphere === "S") northing += 10000000;

  return { zone, band: utmBandLetter(coord.lat), hemisphere, easting, northing };
}

export function utmToDd(utm: UTMCoordinate): Coordinate {
  const lambda0 = utmCentralMeridian(utm.zone);
  const x = (utm.easting - 500000) / UTM_SCALE_FACTOR;
  const y = (utm.hemisphere === "S" ? utm.northing - 10000000 : utm.northing) / UTM_SCALE_FACTOR;

  const { lat, lon } = xyToLatLon(x, y, lambda0);
  return { lat: rad2deg(lat), lng: rad2deg(lon) };
}

export function formatUTM(utm: UTMCoordinate): string {
  return `${utm.zone}${utm.band} ${Math.round(utm.easting)}E ${Math.round(utm.northing)}N`;
}

const UTM_STRING_REGEX = /(\d{1,2})\s*([A-HJ-NP-Z])\s+(\d+(?:\.\d+)?)\s*E?\s+(\d+(?:\.\d+)?)\s*N?/i;

export function parseUTMString(input: string): Coordinate | null {
  const match = input.match(UTM_STRING_REGEX);
  if (!match) return null;

  const zone = parseInt(match[1], 10);
  const band = match[2].toUpperCase();
  const easting = parseFloat(match[3]);
  const northing = parseFloat(match[4]);
  if (zone < 1 || zone > 60) return null;

  const hemisphere: "N" | "S" = band >= "N" ? "N" : "S";
  return utmToDd({ zone, band, hemisphere, easting, northing });
}
