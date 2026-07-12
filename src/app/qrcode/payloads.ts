export interface VCardConfig {
  name: string;
  phone: string;
  email: string;
  org: string;
  url: string;
}

export interface EmailConfig {
  to: string;
  subject: string;
  body: string;
}

export interface SmsConfig {
  phone: string;
  message: string;
}

export interface TelConfig {
  phone: string;
}

export interface GeoConfig {
  lat: string;
  lon: string;
  label: string;
}

export interface EventConfig {
  title: string;
  start: string;
  end: string;
  location: string;
  description: string;
}

// Escapes backslash/comma/semicolon/newline per the vCard/iCalendar content-line spec.
function escapeField(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildVCardPayload({ name, phone, email, org, url }: VCardConfig): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escapeField(name)}`, `N:${escapeField(name)};;;;`];
  if (org) lines.push(`ORG:${escapeField(org)}`);
  if (phone) lines.push(`TEL;TYPE=CELL:${phone.trim()}`);
  if (email) lines.push(`EMAIL:${email.trim()}`);
  if (url) lines.push(`URL:${url.trim()}`);
  lines.push("END:VCARD");
  return lines.join("\n");
}

export function buildEmailPayload({ to, subject, body }: EmailConfig): string {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const qs = params.toString();
  return `mailto:${to.trim()}${qs ? `?${qs}` : ""}`;
}

export function buildSmsPayload({ phone, message }: SmsConfig): string {
  return `SMSTO:${phone.trim()}${message ? `:${message}` : ""}`;
}

export function buildTelPayload({ phone }: TelConfig): string {
  return `tel:${phone.trim()}`;
}

export function buildGeoPayload({ lat, lon, label }: GeoConfig): string {
  const base = `geo:${lat.trim()},${lon.trim()}`;
  return label ? `${base}?q=${lat.trim()},${lon.trim()}(${encodeURIComponent(label)})` : base;
}

// Converts a <input type="datetime-local"> value ("YYYY-MM-DDTHH:mm") into a
// floating-local-time iCalendar DATE-TIME ("YYYYMMDDTHHmmss").
function toICalDate(value: string): string {
  return `${value.replace(/[-:]/g, "")}00`;
}

export function buildEventPayload({ title, start, end, location, description }: EventConfig): string {
  const lines = ["BEGIN:VEVENT", `SUMMARY:${escapeField(title)}`];
  if (start) lines.push(`DTSTART:${toICalDate(start)}`);
  if (end) lines.push(`DTEND:${toICalDate(end)}`);
  if (location) lines.push(`LOCATION:${escapeField(location)}`);
  if (description) lines.push(`DESCRIPTION:${escapeField(description)}`);
  lines.push("END:VEVENT");
  return lines.join("\n");
}
