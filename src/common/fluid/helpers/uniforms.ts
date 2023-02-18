import { UniformsIndex } from '../model/uniforms';

export function getUniforms(renderingContext: WebGL2RenderingContext, program: WebGLProgram): UniformsIndex {
  const uniforms: UniformsIndex = { };
  const uniformCount: number = renderingContext.getProgramParameter(program, renderingContext.ACTIVE_UNIFORMS);

  for (let i = 0; i < uniformCount; i++) {
    const uniformName = renderingContext.getActiveUniform(program, i)?.name as string;
    uniforms[uniformName] = renderingContext.getUniformLocation(program, uniformName) as WebGLUniformLocation;
  }

  return uniforms;
}

