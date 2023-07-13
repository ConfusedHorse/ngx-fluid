import { Dimension } from '../model/dimension';

export class FrameBufferEntity {

  #texture: WebGLTexture | null;
  #frameBufferObject: WebGLFramebuffer | null;
  #texelSizeX: number;
  #texelSizeY: number;

  public get texture(): WebGLTexture | null {
    return this.#texture;
  }

  public get frameBufferObject(): WebGLFramebuffer | null {
    return this.#frameBufferObject;
  }

  public get width(): number {
    return this._dimensions.width;
  }

  public get height(): number {
    return this._dimensions.height;
  }

  public get texelSizeX(): number {
    return this.#texelSizeX;
  }

  public get texelSizeY(): number {
    return this.#texelSizeY;
  }

  constructor(private _renderingContext: WebGL2RenderingContext, private _dimensions: Dimension, internalFormat: number, format: number, type: number, param: number) {
    const {
      TEXTURE0, TEXTURE_2D, TEXTURE_MIN_FILTER, TEXTURE_MAG_FILTER,
      TEXTURE_WRAP_S, TEXTURE_WRAP_T, CLAMP_TO_EDGE, FRAMEBUFFER,
      COLOR_ATTACHMENT0, COLOR_BUFFER_BIT
    } = _renderingContext;
    const { width, height } = _dimensions;

    _renderingContext.activeTexture(TEXTURE0);
    this.#texture = _renderingContext.createTexture();
    _renderingContext.bindTexture(TEXTURE_2D, this.#texture);
    _renderingContext.texParameteri(TEXTURE_2D, TEXTURE_MIN_FILTER, param);
    _renderingContext.texParameteri(TEXTURE_2D, TEXTURE_MAG_FILTER, param);
    _renderingContext.texParameteri(TEXTURE_2D, TEXTURE_WRAP_S, CLAMP_TO_EDGE);
    _renderingContext.texParameteri(TEXTURE_2D, TEXTURE_WRAP_T, CLAMP_TO_EDGE);
    _renderingContext.texImage2D(TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);

    this.#frameBufferObject = _renderingContext.createFramebuffer();
    _renderingContext.bindFramebuffer(FRAMEBUFFER, this.#frameBufferObject);
    _renderingContext.framebufferTexture2D(FRAMEBUFFER, COLOR_ATTACHMENT0, TEXTURE_2D, this.#texture, 0);
    _renderingContext.viewport(0, 0, width, height);
    _renderingContext.clear(COLOR_BUFFER_BIT);

    this.#texelSizeX = 1 / width;
    this.#texelSizeY = 1 / height;
  }

  public attach(id: number): number {
    const { TEXTURE0, TEXTURE_2D } = this._renderingContext;

    this._renderingContext.activeTexture(TEXTURE0 + id);
    this._renderingContext.bindTexture(TEXTURE_2D, this.#texture);

    return id;
  }

}
