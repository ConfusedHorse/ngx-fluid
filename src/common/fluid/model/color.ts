export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface SupportedFormat {
  internalFormat: number;
  format: number;
}

export interface ExternalFormat {
  formatRGBA: SupportedFormat;
  formatRG: SupportedFormat;
  formatR: SupportedFormat;
}

