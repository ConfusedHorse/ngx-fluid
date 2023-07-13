import { createProgram } from '../helpers/program';
import { compileShader } from '../helpers/shaders';
import { getUniforms } from '../helpers/uniforms';
import { UniformsIndex } from '../model/uniforms';
import { DISPLAY_SHADER_SOURCE } from '../shaders/sources';

export class MaterialEntity {

  #programs: WebGLProgram[] = [];
  #activeProgram!: WebGLProgram;
  #uniforms!: UniformsIndex;

  public get uniforms(): UniformsIndex {
    return this.#uniforms;
  }

  constructor(
    private _renderingContext: WebGL2RenderingContext,
    private _vertexShader: WebGLShader
  ) { }

  public setKeywords(keywords: ReadonlyArray<string>): void {
    let hash = 0;
    for(const keyword of keywords) {
      hash += this.#hashCode(keyword);
    }

    let program = this.#programs[hash];
    if (!program) {
      const fragmentShader = compileShader(
        this._renderingContext,
        this._renderingContext.FRAGMENT_SHADER,
        DISPLAY_SHADER_SOURCE,
        keywords
      );

      program = createProgram(this._renderingContext, this._vertexShader, fragmentShader);
      this.#programs[hash] = program;
    }

    if (program === this.#activeProgram) {
      return;
    }

    this.#uniforms = getUniforms(this._renderingContext, program);
    this.#activeProgram = program;
  }

  public bind(): void {
    this._renderingContext.useProgram(this.#activeProgram);
  }

  #hashCode(keyword: string): number {
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
