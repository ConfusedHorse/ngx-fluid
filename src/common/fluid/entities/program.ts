import { createProgram } from '../helpers/program';
import { getUniforms } from '../helpers/uniforms';
import { UniformsIndex } from '../model/uniforms';

export class ProgramEntity {

  #program: WebGLProgram;
  #uniforms: UniformsIndex;

  public get program(): WebGLProgram {
    return this.#program;
  }

  public get uniforms(): UniformsIndex {
    return this.#uniforms;
  }

  constructor(private _renderingContext: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
    this.#program = createProgram(_renderingContext, vertexShader, fragmentShader);
    this.#uniforms = getUniforms(_renderingContext, this.#program);
  }

  public bind(): void {
    this._renderingContext.useProgram(this.program);
  }

}
