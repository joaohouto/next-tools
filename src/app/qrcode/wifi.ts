export type WifiSecurity = "WPA" | "WEP" | "nopass";

export interface WifiConfig {
  ssid: string;
  password: string;
  security: WifiSecurity;
  hidden: boolean;
}

// Escapes characters that are special in the WIFI: QR payload format (ZXing convention).
function escapeWifiValue(value: string): string {
  return value.replace(/([\\;,":])/g, "\\$1");
}

export function buildWifiPayload({ ssid, password, security, hidden }: WifiConfig): string {
  const p = security === "nopass" ? "" : escapeWifiValue(password);
  return `WIFI:T:${security};S:${escapeWifiValue(ssid)};P:${p};H:${hidden ? "true" : "false"};;`;
}
