import { Dimension } from '../model/dimension';
import { FrameBufferEntity } from './frameBuffer';

export class DoubleFrameBufferEntity {

  #frameBuffer1: FrameBufferEntity;
  #frameBuffer2: FrameBufferEntity;

  public get width(): number {
    return this._dimensions.width;
  }

  public get height(): number {
    return this._dimensions.height;
  }

  public get texelSizeX(): number {
    return this.#frameBuffer1.texelSizeX;
  }

  public get texelSizeY(): number {
    return this.#frameBuffer1.texelSizeY;
  }

  public get read(): FrameBufferEntity {
    return this.#frameBuffer1;
  }
  public set read(frameBuffer: FrameBufferEntity) {
    this.#frameBuffer1 = frameBuffer;
    this._dimensions = { width: frameBuffer.width, height: frameBuffer.height };
  }

  public get write(): FrameBufferEntity {
    return this.#frameBuffer2;
  }
  public set write(frameBuffer: FrameBufferEntity) {
    this.#frameBuffer2 = frameBuffer;
    this._dimensions = { width: frameBuffer.width, height: frameBuffer.height };
  }

  constructor(renderingContext: WebGL2RenderingContext, private _dimensions: Dimension, internalFormat: number, format: number, type: number, param: number) {
    this.#frameBuffer1 = new FrameBufferEntity(renderingContext, _dimensions, internalFormat, format, type, param);
    this.#frameBuffer2 = new FrameBufferEntity(renderingContext, _dimensions, internalFormat, format, type, param);
  }

  public swap(): void {
    const temp = this.#frameBuffer1;
    this.#frameBuffer1 = this.#frameBuffer2;
    this.#frameBuffer2 = temp;
  }

}
