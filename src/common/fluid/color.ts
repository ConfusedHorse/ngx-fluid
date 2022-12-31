export interface WeirdColor {
  r: number;
  g: number;
  b: number;
}

export function getRandomColor(dim: number = .15) {
  // TODO this can't stay like this, probably work with an actual color type (webgl?)
  const color = _weirdHSVtoRGB(Math.random(), 1, 1);
  color.r *= dim;
  color.g *= dim;
  color.b *= dim;
  return color;
}

export function normalizeColor(color: WeirdColor) {
  return {
    r: color.r / 255,
    g: color.g / 255,
    b: color.b / 255
  };
}

function _weirdHSVtoRGB(h: number, s: number, v: number): WeirdColor {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i % 6) {
      case 0: return { r: v, g: t, b: p };
      case 1: return { r: q, g: v, b: p };
      case 2: return { r: p, g: v, b: t };
      case 3: return { r: p, g: q, b: v };
      case 4: return { r: t, g: p, b: v };
      default: return { r: v, g: p, b: q };
  }
}
