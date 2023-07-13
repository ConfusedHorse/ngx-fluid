import { ProgramEntity } from '../entities/program';
import { Programs } from '../model/program';
import { CompiledShaders } from '../model/shaders';

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

export function createPrograms(renderingContext: WebGL2RenderingContext, compiledShaders: CompiledShaders): Programs {
  const {
    baseVertexShader,
    blurVertexShader,
    blurShader,
    copyShader,
    clearShader,
    colorShader,
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
    blurProgram: new ProgramEntity(renderingContext, blurVertexShader, blurShader),
    copyProgram: new ProgramEntity(renderingContext, baseVertexShader, copyShader),
    clearProgram: new ProgramEntity(renderingContext, baseVertexShader, clearShader),
    colorProgram: new ProgramEntity(renderingContext, baseVertexShader, colorShader),
    bloomPrefilterProgram: new ProgramEntity(renderingContext, baseVertexShader, bloomPrefilterShader),
    bloomBlurProgram: new ProgramEntity(renderingContext, baseVertexShader, bloomBlurShader),
    bloomFinalProgram: new ProgramEntity(renderingContext, baseVertexShader, bloomFinalShader),
    sunraysMaskProgram: new ProgramEntity(renderingContext, baseVertexShader, sunraysMaskShader),
    sunraysProgram: new ProgramEntity(renderingContext, baseVertexShader, sunraysShader),
    splatProgram: new ProgramEntity(renderingContext, baseVertexShader, splatShader),
    advectionProgram: new ProgramEntity(renderingContext, baseVertexShader, advectionShader),
    divergenceProgram: new ProgramEntity(renderingContext, baseVertexShader, divergenceShader),
    curlProgram: new ProgramEntity(renderingContext, baseVertexShader, curlShader),
    vorticityProgram: new ProgramEntity(renderingContext, baseVertexShader, vorticityShader),
    pressureProgram: new ProgramEntity(renderingContext, baseVertexShader, pressureShader),
    gradienSubtractProgram: new ProgramEntity(renderingContext, baseVertexShader, gradientSubtractShader),
  };
}

