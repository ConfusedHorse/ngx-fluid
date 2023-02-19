import { ExternalFormat, Rgb, SupportedFormat } from '../model/color';

export function rgb(r: number, g: number, b: number): Rgb {
  return normalizeColor({ r, g, b });
}

export function getRandomColor(dim: number = .15) {
  const color = _hsvtoRgb(Math.random(), 1, 1);
  color.r *= dim;
  color.g *= dim;
  color.b *= dim;
  return color;
}

export function normalizeColor(color: Rgb) {
  return {
    r: color.r / 255,
    g: color.g / 255,
    b: color.b / 255
  };
}

function _hsvtoRgb(h: number, s: number, v: number): Rgb {
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

export function getExternalFormat(renderingContext: WebGL2RenderingContext): ExternalFormat {
  const { RGBA16F, RGBA, RG16F, RG, R16F, RED, HALF_FLOAT } = renderingContext;

  return {
    formatRGBA: _getSupportedFormat(renderingContext, RGBA16F, RGBA, HALF_FLOAT) as SupportedFormat,
    formatRG: _getSupportedFormat(renderingContext, RG16F, RG, HALF_FLOAT) as SupportedFormat,
    formatR: _getSupportedFormat(renderingContext, R16F, RED, HALF_FLOAT) as SupportedFormat
  };
}

function _getSupportedFormat(renderingContext: WebGL2RenderingContext, internalFormat: number, format: number, type: number): SupportedFormat | null {
  const { R16F, RG16F, RG, RGBA16F, RGBA } = renderingContext;

  if (_supportRenderTextureFormat(renderingContext, internalFormat, format, type)) {
    return {
      internalFormat,
      format
    };
  }

  switch (internalFormat) {
    case R16F:
      return _getSupportedFormat(renderingContext, RG16F, RG, type);
    case RG16F:
      return _getSupportedFormat(renderingContext, RGBA16F, RGBA, type);
    default:
      return null;
  }
}

function _supportRenderTextureFormat(renderingContext: WebGL2RenderingContext, internalFormat: number, format: number, type: number): boolean {
  const texture = renderingContext.createTexture();
  const {
    TEXTURE_2D, TEXTURE_MIN_FILTER, TEXTURE_MAG_FILTER, NEAREST,
    TEXTURE_WRAP_S, TEXTURE_WRAP_T, CLAMP_TO_EDGE, FRAMEBUFFER,
    COLOR_ATTACHMENT0, FRAMEBUFFER_COMPLETE
  } = renderingContext;

  renderingContext.bindTexture(TEXTURE_2D, texture);
  renderingContext.texParameteri(TEXTURE_2D, TEXTURE_MIN_FILTER, NEAREST);
  renderingContext.texParameteri(TEXTURE_2D, TEXTURE_MAG_FILTER, NEAREST);
  renderingContext.texParameteri(TEXTURE_2D, TEXTURE_WRAP_S, CLAMP_TO_EDGE);
  renderingContext.texParameteri(TEXTURE_2D, TEXTURE_WRAP_T, CLAMP_TO_EDGE);
  renderingContext.texImage2D(TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

  const frameBufferObject = renderingContext.createFramebuffer();
  renderingContext.bindFramebuffer(FRAMEBUFFER, frameBufferObject);
  renderingContext.framebufferTexture2D(FRAMEBUFFER, COLOR_ATTACHMENT0, TEXTURE_2D, texture, 0);

  const status = renderingContext.checkFramebufferStatus(FRAMEBUFFER);
  return status === FRAMEBUFFER_COMPLETE;
}
