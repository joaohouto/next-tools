export interface Coordinate {
  lat: number;
  lng: number;
}

export interface DMSComponent {
  deg: number;
  min: number;
  sec: number;
  dir: "N" | "S" | "E" | "W";
}

export interface DMSCoordinate {
  lat: DMSComponent;
  lng: DMSComponent;
}

export interface UTMCoordinate {
  zone: number;
  band: string;
  hemisphere: "N" | "S";
  easting: number;
  northing: number;
}

export interface NominatimAddress {
  road?: string;
  house_number?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
  [key: string]: string | undefined;
}

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string];
  address?: NominatimAddress;
}
