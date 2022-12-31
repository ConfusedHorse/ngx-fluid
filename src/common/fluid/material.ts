import { createProgram, getUniforms, UniformsIndex } from './model';
import { compileShader } from './shaders';
import { DISPLAY_SHADER_SOURCE } from './sources';

export class Material {

  private _programs: WebGLProgram[] = [];
  private _activeProgram!: WebGLProgram;
  private _uniforms!: UniformsIndex;

  public get uniforms(): UniformsIndex {
    return this._uniforms;
  }

  constructor(private _renderingContext: WebGL2RenderingContext, private _vertexShader: WebGLShader) { }

  public setKeywords(keywords: ReadonlyArray<string>): void {
    let hash = 0;
    for(const keyword of keywords) {
      hash += this._hashCode(keyword);
    }

    let program = this._programs[hash];
    if (!program) {
      const fragmentShader = compileShader(
        this._renderingContext,
        this._renderingContext.FRAGMENT_SHADER,
        DISPLAY_SHADER_SOURCE,
        keywords
      );

      program = createProgram(this._renderingContext, this._vertexShader, fragmentShader);
      this._programs[hash] = program;
    }

    if (program === this._activeProgram) {
      return;
    }

    this._uniforms = getUniforms(this._renderingContext, program);
    this._activeProgram = program;
  }

  public bind(): void {
    this._renderingContext.useProgram(this._activeProgram);
  }

  private _hashCode(keyword: string): number {
    if (keyword.length === 0) {
      return 0;
    }

    let hash = 0;
    for (let i = 0; i < keyword.length; i++) {
        // eslint-disable-next-line no-bitwise
        hash = (hash << 5) - hash + keyword.charCodeAt(i);
        // eslint-disable-next-line no-bitwise
        hash |= 0; // Convert to 32bit integer
    }

    return hash;
  };

}
