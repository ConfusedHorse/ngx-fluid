import { InjectionToken } from '@angular/core';
import { WeirdColor } from './color';
import { Material } from './material';
import { Program } from './program';

export interface FluidConfiguration {
  simResolution: number;
  dyeResolution: number;
  densityDissipation: number;
  velocityDissipation: number;
  pressure: number;
  pressureIterations: number;
  curl: number;
  splatRadius: number;
  splatForce: number;
  shading: boolean;
  transparent: boolean;
  backColor: WeirdColor;
  bloom: boolean;
  bloomIterations: number;
  bloomResolution: number;
  bloomIntensity: number;
  bloomThreshold: number;
  bloomSoftKnee: number;
  sunrays: boolean;
  sunraysResolution: number;
  sunraysWeight: number;
}

export interface CompiledShaders {
  baseVertexShader: WebGLShader;
  blurVertexShader: WebGLShader;
  blurShader: WebGLShader;
  copyShader: WebGLShader;
  clearShader: WebGLShader;
  colorShader: WebGLShader;
  checkerboardShader: WebGLShader;
  bloomPrefilterShader: WebGLShader;
  bloomBlurShader: WebGLShader;
  bloomFinalShader: WebGLShader;
  sunraysMaskShader: WebGLShader;
  sunraysShader: WebGLShader;
  splatShader: WebGLShader;
  advectionShader: WebGLShader;
  divergenceShader: WebGLShader;
  curlShader: WebGLShader;
  vorticityShader: WebGLShader;
  pressureShader: WebGLShader;
  gradientSubtractShader: WebGLShader;
}

export interface UniformsIndex {
  [property: string]: WebGLUniformLocation;
};

export interface Programs {
  blurProgram: Program;
  copyProgram: Program;
  clearProgram: Program;
  colorProgram: Program;
  checkerboardProgram: Program;
  bloomPrefilterProgram: Program;
  bloomBlurProgram: Program;
  bloomFinalProgram: Program;
  sunraysMaskProgram: Program;
  sunraysProgram: Program;
  splatProgram: Program;
  advectionProgram: Program;
  divergenceProgram: Program;
  curlProgram: Program;
  vorticityProgram: Program;
  pressureProgram: Program;
  gradienSubtractProgram: Program;
}

export interface Dimensions {
  width: number;
  height: number;
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

export interface SplatParameters {
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: WeirdColor;
}
export interface TexCoordinates {
  x: number;
  y: number;
}

export interface TexMovement extends TexCoordinates {
  deltaX: number;
  deltaY: number;
}

export function correctDeltaX(delta: number, dimensions: Dimensions) {
  const { width, height } = dimensions;

  const aspectRatio = width / height;
  if (aspectRatio < 1) {
    delta *= aspectRatio;
  }

  return delta;
}

export function correctDeltaY(delta: number, dimensions: Dimensions) {
  const { width, height } = dimensions;

  const aspectRatio = width / height;
  if (aspectRatio > 1) {
    delta /= aspectRatio;
  }

  return delta;
}

export const INJECT_FLUID_CONFIGURATION = new InjectionToken<Partial<FluidConfiguration>>('INJECT_FLUID_CONFIGURATION');

export function getExternalFormat(renderingContext: WebGL2RenderingContext): ExternalFormat {
  const { RGBA16F, RGBA, RG16F, RG, R16F, RED, HALF_FLOAT } = renderingContext;

  return {
    formatRGBA: _getSupportedFormat(renderingContext, RGBA16F, RGBA, HALF_FLOAT) as SupportedFormat,
    formatRG: _getSupportedFormat(renderingContext, RG16F, RG, HALF_FLOAT) as SupportedFormat,
    formatR: _getSupportedFormat(renderingContext, R16F, RED, HALF_FLOAT) as SupportedFormat
  };
}

export function createProgram(renderingContext: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
  const program = renderingContext.createProgram() as WebGLProgram;

  renderingContext.attachShader(program, vertexShader);
  renderingContext.attachShader(program, fragmentShader);
  renderingContext.linkProgram(program);

  if (!renderingContext.getProgramParameter(program, renderingContext.LINK_STATUS)) {
    console.error(renderingContext.getProgramInfoLog(program));
  }

  return program;
}

export function getUniforms(renderingContext: WebGL2RenderingContext, program: WebGLProgram): UniformsIndex {
  const uniforms: UniformsIndex = { };
  const uniformCount: number = renderingContext.getProgramParameter(program, renderingContext.ACTIVE_UNIFORMS);

  for (let i = 0; i < uniformCount; i++) {
    const uniformName = renderingContext.getActiveUniform(program, i)?.name as string;
    uniforms[uniformName] = renderingContext.getUniformLocation(program, uniformName) as WebGLUniformLocation;
  }

  return uniforms;
}

export function createPrograms(renderingContext: WebGL2RenderingContext, compiledShaders: CompiledShaders): Programs {
  const {
    baseVertexShader,
    blurVertexShader,
    blurShader,
    copyShader,
    clearShader,
    colorShader,
    checkerboardShader,
    bloomPrefilterShader,
    bloomBlurShader,
    bloomFinalShader,
    sunraysMaskShader,
    sunraysShader,
    splatShader,
    advectionShader,
    divergenceShader,
    curlShader,
    vorticityShader,
    pressureShader,
    gradientSubtractShader
  } = compiledShaders;

  return {
    blurProgram: new Program(renderingContext, blurVertexShader, blurShader),
    copyProgram: new Program(renderingContext, baseVertexShader, copyShader),
    clearProgram: new Program(renderingContext, baseVertexShader, clearShader),
    colorProgram: new Program(renderingContext, baseVertexShader, colorShader),
    checkerboardProgram: new Program(renderingContext, baseVertexShader, checkerboardShader),
    bloomPrefilterProgram: new Program(renderingContext, baseVertexShader, bloomPrefilterShader),
    bloomBlurProgram: new Program(renderingContext, baseVertexShader, bloomBlurShader),
    bloomFinalProgram: new Program(renderingContext, baseVertexShader, bloomFinalShader),
    sunraysMaskProgram: new Program(renderingContext, baseVertexShader, sunraysMaskShader),
    sunraysProgram: new Program(renderingContext, baseVertexShader, sunraysShader),
    splatProgram: new Program(renderingContext, baseVertexShader, splatShader),
    advectionProgram: new Program(renderingContext, baseVertexShader, advectionShader),
    divergenceProgram: new Program(renderingContext, baseVertexShader, divergenceShader),
    curlProgram: new Program(renderingContext, baseVertexShader, curlShader),
    vorticityProgram: new Program(renderingContext, baseVertexShader, vorticityShader),
    pressureProgram: new Program(renderingContext, baseVertexShader, pressureShader),
    gradienSubtractProgram: new Program(renderingContext, baseVertexShader, gradientSubtractShader),
  };
}

export function createMaterial(renderingContext: WebGL2RenderingContext, vertexShader: WebGLShader): Material {
  return new Material(renderingContext, vertexShader);
}

export function getResolution(renderingContext: WebGL2RenderingContext, resolution: number): Dimensions {
  // TODO optimize this

  const { drawingBufferWidth, drawingBufferHeight } = renderingContext;
  let aspectRatio = drawingBufferWidth / drawingBufferHeight;
  if (aspectRatio < 1) {
    aspectRatio = 1 / aspectRatio;
  }

  const min = Math.round(resolution);
  const max = Math.round(resolution * aspectRatio);

  return drawingBufferWidth > drawingBufferHeight
    ? { width: max, height: min }
    : { width: min, height: max };
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
