
export class DitheringTexture {

  private readonly _ditheringTextureSource = 'assets/LDR_LLL1_0.png';

  private _texture!: WebGLTexture | null;
  private _image!: HTMLImageElement;

  public get width(): number {
    return this._image.width;
  }

  public get height(): number {
    return this._image.height;
  }

  constructor(private _renderingContext: WebGL2RenderingContext) {
    this._initializeTexture();
    this._bindTexture();
  }

  public attach(id: number): number {
    const { TEXTURE0, TEXTURE_2D } = this._renderingContext;

    this._renderingContext.activeTexture(TEXTURE0 + id);
    this._renderingContext.bindTexture(TEXTURE_2D, this._texture);

    return id;
  }

  private _initializeTexture(): void {
    const {
      TEXTURE_2D, LINEAR, TEXTURE_MIN_FILTER, TEXTURE_MAG_FILTER,
      TEXTURE_WRAP_S, TEXTURE_WRAP_T, REPEAT, RGB, UNSIGNED_BYTE
    } = this._renderingContext;

    this._texture = this._renderingContext.createTexture();

    this._renderingContext.bindTexture(TEXTURE_2D, this._texture);
    this._renderingContext.texParameteri(TEXTURE_2D, TEXTURE_MIN_FILTER, LINEAR);
    this._renderingContext.texParameteri(TEXTURE_2D, TEXTURE_MAG_FILTER, LINEAR);
    this._renderingContext.texParameteri(TEXTURE_2D, TEXTURE_WRAP_S, REPEAT);
    this._renderingContext.texParameteri(TEXTURE_2D, TEXTURE_WRAP_T, REPEAT);
    this._renderingContext.texImage2D(TEXTURE_2D, 0, RGB, 1, 1, 0, RGB, UNSIGNED_BYTE, new Uint8Array([255, 255, 255]));
  }

  private _bindTexture() {
    const { TEXTURE_2D, RGB, UNSIGNED_BYTE } = this._renderingContext;

    this._image = new Image();
    this._image.onload = () => {
      this._renderingContext.bindTexture(TEXTURE_2D, this._texture);
      this._renderingContext.texImage2D(TEXTURE_2D, 0, RGB, RGB, UNSIGNED_BYTE, this._image);
    };

    this._image.src = this._ditheringTextureSource;
  }

}
