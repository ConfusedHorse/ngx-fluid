import { createProgram, getUniforms, UniformsMap } from './model';

export class Program {

  private _program!: WebGLProgram;
  private _uniforms!: UniformsMap;

  public get program(): WebGLProgram {
    return this._program;
  }

  public get uniforms(): UniformsMap {
    return this._uniforms;
  }

  constructor(private _renderingContext: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
    this._program = createProgram(_renderingContext, vertexShader, fragmentShader);
    this._uniforms = getUniforms(_renderingContext, this._program);
  }

  public bind(): void {
    this._renderingContext.useProgram(this.program);
  }

}
