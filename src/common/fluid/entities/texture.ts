
export class DitheringTextureEntity {

  readonly #ditheringTextureSource = 'assets/LDR_LLL1_0.png';

  #texture: WebGLTexture | null;
  #image: HTMLImageElement;

  public get width(): number {
    return this.#image.width;
  }

  public get height(): number {
    return this.#image.height;
  }

  constructor(private _renderingContext: WebGL2RenderingContext) {
    this.#initializeTexture();
    this.#bindTexture();
  }

  public attach(id: number): number {
    const { TEXTURE0, TEXTURE_2D } = this._renderingContext;

    this._renderingContext.activeTexture(TEXTURE0 + id);
    this._renderingContext.bindTexture(TEXTURE_2D, this.#texture);

    return id;
  }

  #initializeTexture(): void {
    const {
      TEXTURE_2D, LINEAR, TEXTURE_MIN_FILTER, TEXTURE_MAG_FILTER,
      TEXTURE_WRAP_S, TEXTURE_WRAP_T, REPEAT, RGB, UNSIGNED_BYTE
    } = this._renderingContext;

    this.#texture = this._renderingContext.createTexture();

    this._renderingContext.bindTexture(TEXTURE_2D, this.#texture);
    this._renderingContext.texParameteri(TEXTURE_2D, TEXTURE_MIN_FILTER, LINEAR);
    this._renderingContext.texParameteri(TEXTURE_2D, TEXTURE_MAG_FILTER, LINEAR);
    this._renderingContext.texParameteri(TEXTURE_2D, TEXTURE_WRAP_S, REPEAT);
    this._renderingContext.texParameteri(TEXTURE_2D, TEXTURE_WRAP_T, REPEAT);
    this._renderingContext.texImage2D(TEXTURE_2D, 0, RGB, 1, 1, 0, RGB, UNSIGNED_BYTE, new Uint8Array([255, 255, 255]));
  }

  #bindTexture() {
    const { TEXTURE_2D, RGB, UNSIGNED_BYTE } = this._renderingContext;

    this.#image = new Image();
    this.#image.onload = () => {
      this._renderingContext.bindTexture(TEXTURE_2D, this.#texture);
      this._renderingContext.texImage2D(TEXTURE_2D, 0, RGB, RGB, UNSIGNED_BYTE, this.#image);
    };

    this.#image.src = this.#ditheringTextureSource;
  }

}
