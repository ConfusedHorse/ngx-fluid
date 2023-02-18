import { Dimension } from '../model/dimension';

export class FrameBufferEntity {

  private _texture: WebGLTexture | null;
  private _frameBufferObject: WebGLFramebuffer | null;
  private _texelSizeX: number;
  private _texelSizeY: number;

  public get texture(): WebGLTexture | null {
    return this._texture;
  }

  public get frameBufferObject(): WebGLFramebuffer | null {
    return this._frameBufferObject;
  }

  public get width(): number {
    return this._dimensions.width;
  }

  public get height(): number {
    return this._dimensions.height;
  }

  public get texelSizeX(): number {
    return this._texelSizeX;
  }

  public get texelSizeY(): number {
    return this._texelSizeY;
  }

  constructor(private _renderingContext: WebGL2RenderingContext, private _dimensions: Dimension, internalFormat: number, format: number, type: number, param: number) {
    const {
      TEXTURE0, TEXTURE_2D, TEXTURE_MIN_FILTER, TEXTURE_MAG_FILTER,
      TEXTURE_WRAP_S, TEXTURE_WRAP_T, CLAMP_TO_EDGE, FRAMEBUFFER,
      COLOR_ATTACHMENT0, COLOR_BUFFER_BIT
    } = _renderingContext;
    const { width, height } = _dimensions;

    _renderingContext.activeTexture(TEXTURE0);
    this._texture = _renderingContext.createTexture();
    _renderingContext.bindTexture(TEXTURE_2D, this._texture);
    _renderingContext.texParameteri(TEXTURE_2D, TEXTURE_MIN_FILTER, param);
    _renderingContext.texParameteri(TEXTURE_2D, TEXTURE_MAG_FILTER, param);
    _renderingContext.texParameteri(TEXTURE_2D, TEXTURE_WRAP_S, CLAMP_TO_EDGE);
    _renderingContext.texParameteri(TEXTURE_2D, TEXTURE_WRAP_T, CLAMP_TO_EDGE);
    _renderingContext.texImage2D(TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null);

    this._frameBufferObject = _renderingContext.createFramebuffer();
    _renderingContext.bindFramebuffer(FRAMEBUFFER, this._frameBufferObject);
    _renderingContext.framebufferTexture2D(FRAMEBUFFER, COLOR_ATTACHMENT0, TEXTURE_2D, this._texture, 0);
    _renderingContext.viewport(0, 0, width, height);
    _renderingContext.clear(COLOR_BUFFER_BIT);

    this._texelSizeX = 1 / width;
    this._texelSizeY = 1 / height;
  }

  public attach(id: number): number {
    const { TEXTURE0, TEXTURE_2D } = this._renderingContext;

    this._renderingContext.activeTexture(TEXTURE0 + id);
    this._renderingContext.bindTexture(TEXTURE_2D, this._texture);

    return id;
  }

}

export class DoubleFrameBufferEntity {

  private _frameBuffer1: FrameBufferEntity;
  private _frameBuffer2: FrameBufferEntity;

  public get width(): number {
    return this._dimensions.width;
  }

  public get height(): number {
    return this._dimensions.height;
  }

  public get texelSizeX(): number {
    return this._frameBuffer1.texelSizeX;
  }

  public get texelSizeY(): number {
    return this._frameBuffer1.texelSizeY;
  }

  public get read(): FrameBufferEntity {
    return this._frameBuffer1;
  }
  public set read(frameBuffer: FrameBufferEntity) {
    this._frameBuffer1 = frameBuffer;
    this._dimensions = { width: frameBuffer.width, height: frameBuffer.height };
  }

  public get write(): FrameBufferEntity {
    return this._frameBuffer2;
  }
  public set write(frameBuffer: FrameBufferEntity) {
    this._frameBuffer2 = frameBuffer;
    this._dimensions = { width: frameBuffer.width, height: frameBuffer.height };
  }

  constructor(renderingContext: WebGL2RenderingContext, private _dimensions: Dimension, internalFormat: number, format: number, type: number, param: number) {
    this._frameBuffer1 = new FrameBufferEntity(renderingContext, _dimensions, internalFormat, format, type, param);
    this._frameBuffer2 = new FrameBufferEntity(renderingContext, _dimensions, internalFormat, format, type, param);
  }

  public swap(): void {
    const temp = this._frameBuffer1;
    this._frameBuffer1 = this._frameBuffer2;
    this._frameBuffer2 = temp;
  }

}
