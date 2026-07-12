export interface PixConfig {
  key: string;
  merchantName: string;
  merchantCity: string;
  amount: string;
  description: string;
}

function tlv(id: string, value: string): string {
  return `${id}${value.length.toString().padStart(2, "0")}${value}`;
}

const COMBINING_MARKS_RE = /[\u0300-\u036f]/g;

// PIX BR Code merchant/city fields only allow a restricted charset (per BACEN spec) —
// strip accents and non-alphanumeric characters, and uppercase.
function sanitizePixText(text: string, maxLen: number): string {
  const clean = text
    .normalize("NFD").replace(COMBINING_MARKS_RE, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .toUpperCase()
    .trim();
  return (clean || text.trim()).slice(0, maxLen);
}

// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — the checksum required by the
// EMV/PIX BR Code spec, computed over the full payload with a "6304" placeholder
// for the CRC field itself.
function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildPixPayload({ key, merchantName, merchantCity, amount, description }: PixConfig): string {
  const merchantAccountInfo = tlv("26",
    tlv("00", "br.gov.bcb.pix") +
    tlv("01", key.trim()) +
    (description ? tlv("02", sanitizePixText(description, 99)) : ""),
  );

  const amountValue = parseFloat(amount.replace(",", "."));
  const amountField = amount && !isNaN(amountValue) ? tlv("54", amountValue.toFixed(2)) : "";

  const additionalData = tlv("62", tlv("05", "***"));

  const payload =
    tlv("00", "01") +
    tlv("01", "11") +
    merchantAccountInfo +
    tlv("52", "0000") +
    tlv("53", "986") +
    amountField +
    tlv("58", "BR") +
    tlv("59", sanitizePixText(merchantName, 25)) +
    tlv("60", sanitizePixText(merchantCity, 15)) +
    additionalData +
    "6304";

  return payload + crc16(payload);
}
