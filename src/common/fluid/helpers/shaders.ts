import { CompiledShaders } from '../model/shaders';
import {
  ADVECTION_SHADER_SOURCE,
  BASE_VERTEX_SHADER_SOURCE,
  BLOOM_BLUR_SHADER_SOURCE,
  BLOOM_FINAL_SHADER_SOURCE,
  BLOOM_PREFILTER_SHADER_SOURCE,
  BLUR_SHADER_SOURCE,
  BLUR_VERTEX_SHADER_SOURCE,
  CHECKERBOARD_SHADER_SOURCE,
  CLEAR_SHADER_SOURCE,
  COLOR_SHADER_SOURCE,
  COPY_SHADER_SOURCE,
  CURL_SHADER_SOURCE,
  DIVERGENCE_SHADER_SOURCE,
  GRADIENT_SUBTRACT_SHADER_SOURCE,
  PRESSURE_SHADER_SOURCE,
  SPLAT_SHADER_SOURCE,
  SUNRAYS_MASK_SHADER_SOURCE,
  SUNRAYS_SHADER_SOURCE,
  VORTICITY_SHADER_SOURCE
} from '../shaders/sources';

export function compileShaders(renderingContext: WebGL2RenderingContext): CompiledShaders {
  return {
    baseVertexShader: baseVertexShader(renderingContext),
    blurVertexShader: blurVertexShader(renderingContext),
    blurShader: blurShader(renderingContext),
    copyShader: copyShader(renderingContext),
    clearShader: clearShader(renderingContext),
    colorShader: colorShader(renderingContext),
    checkerboardShader: checkerboardShader(renderingContext),
    bloomPrefilterShader: bloomPrefilterShader(renderingContext),
    bloomBlurShader: bloomBlurShader(renderingContext),
    bloomFinalShader: bloomFinalShader(renderingContext),
    sunraysMaskShader: sunraysMaskShader(renderingContext),
    sunraysShader: sunraysShader(renderingContext),
    splatShader: splatShader(renderingContext),
    advectionShader: advectionShader(renderingContext),
    divergenceShader: divergenceShader(renderingContext),
    curlShader: curlShader(renderingContext),
    vorticityShader: vorticityShader(renderingContext),
    pressureShader: pressureShader(renderingContext),
    gradientSubtractShader: gradientSubtractShader(renderingContext)
  };
};

const baseVertexShader = (renderingContext: WebGL2RenderingContext): WebGLShader => compileShader(
  renderingContext,
  renderingContext.VERTEX_SHADER,
  BASE_VERTEX_SHADER_SOURCE
);

const blurVertexShader = (renderingContext: WebGL2RenderingContext): WebGLShader => compileShader(
  renderingContext,
  renderingContext.VERTEX_SHADER,
  BLUR_VERTEX_SHADER_SOURCE
);

const blurShader = (renderingContext: WebGL2RenderingContext): WebGLShader => compileShader(
  renderingContext,
  renderingContext.FRAGMENT_SHADER,
  BLUR_SHADER_SOURCE
);

const copyShader = (renderingContext: WebGL2RenderingContext): WebGLShader => compileShader(
  renderingContext,
  renderingContext.FRAGMENT_SHADER,
  COPY_SHADER_SOURCE
);

const clearShader = (renderingContext: WebGL2RenderingContext): WebGLShader => compileShader(
  renderingContext,
  renderingContext.FRAGMENT_SHADER,
  CLEAR_SHADER_SOURCE
);

const colorShader = (renderingContext: WebGL2RenderingContext): WebGLShader => compileShader(
  renderingContext,
  renderingContext.FRAGMENT_SHADER,
  COLOR_SHADER_SOURCE
);

const checkerboardShader = (renderingContext: WebGL2RenderingContext): WebGLShader => compileShader(
  renderingContext,
  renderingContext.FRAGMENT_SHADER,
  CHECKERBOARD_SHADER_SOURCE
);

const bloomPrefilterShader = (renderingContext: WebGL2RenderingContext): WebGLShader => compileShader(
  renderingContext,
  renderingContext.FRAGMENT_SHADER,
  BLOOM_PREFILTER_SHADER_SOURCE
);

const bloomBlurShader = (renderingContext: WebGL2RenderingContext): WebGLShader => compileShader(
  renderingContext,
  renderingContext.FRAGMENT_SHADER,
  BLOOM_BLUR_SHADER_SOURCE
);

const bloomFinalShader = (renderingContext: WebGL2RenderingContext): WebGLShader => compileShader(
  renderingContext,
  renderingContext.FRAGMENT_SHADER,
  BLOOM_FINAL_SHADER_SOURCE
);

const sunraysMaskShader = (renderingContext: WebGL2RenderingContext): WebGLShader => compileShader(
  renderingContext,
  renderingContext.FRAGMENT_SHADER,
  SUNRAYS_MASK_SHADER_SOURCE
);

const sunraysShader = (renderingContext: WebGL2RenderingContext): WebGLShader => compileShader(
  renderingContext,
  renderingContext.FRAGMENT_SHADER,
  SUNRAYS_SHADER_SOURCE
);

const splatShader = (renderingContext: WebGL2RenderingContext): WebGLShader => compileShader(
  renderingContext,
  renderingContext.FRAGMENT_SHADER,
  SPLAT_SHADER_SOURCE
);

const advectionShader = (renderingContext: WebGL2RenderingContext): WebGLShader => compileShader(
  renderingContext,
  renderingContext.FRAGMENT_SHADER,
  ADVECTION_SHADER_SOURCE
);

const divergenceShader = (renderingContext: WebGL2RenderingContext): WebGLShader => compileShader(
  renderingContext,
  renderingContext.FRAGMENT_SHADER,
  DIVERGENCE_SHADER_SOURCE
);

const curlShader = (renderingContext: WebGL2RenderingContext): WebGLShader => compileShader(
  renderingContext,
  renderingContext.FRAGMENT_SHADER,
  CURL_SHADER_SOURCE
);

const vorticityShader = (renderingContext: WebGL2RenderingContext): WebGLShader => compileShader(
  renderingContext,
  renderingContext.FRAGMENT_SHADER,
  VORTICITY_SHADER_SOURCE
);

const pressureShader = (renderingContext: WebGL2RenderingContext): WebGLShader => compileShader(
  renderingContext,
  renderingContext.FRAGMENT_SHADER,
  PRESSURE_SHADER_SOURCE
);

const gradientSubtractShader = (renderingContext: WebGL2RenderingContext): WebGLShader => compileShader(
  renderingContext,
  renderingContext.FRAGMENT_SHADER,
  GRADIENT_SUBTRACT_SHADER_SOURCE
);

export function compileShader(renderingContext: WebGL2RenderingContext, type: number, source: string, keywords?: ReadonlyArray<string>): WebGLShader {
  source = keywords ? _addKeywords(source, keywords) : source;

  const shader = renderingContext.createShader(type) as WebGLShader;

  renderingContext.shaderSource(shader, source);
  renderingContext.compileShader(shader);

  return shader;
};

function _addKeywords(source: string, keywords: ReadonlyArray<string>): string {
  let keywordsString = '';
  keywords.forEach(keyword => {
    keywordsString += '#define ' + keyword + '\n';
  });

  return keywordsString + source;
};
