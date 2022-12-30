import { Inject, Injectable, Optional } from '@angular/core';
import { DoubleFrameBuffer, FrameBuffer } from './frameBuffer';
import { Material } from './material';
import { CompiledShaders, createMaterial, createPrograms, DEFAULT_FLUID_CONFIGURATION, Dimensions, ExternalFormat, FluidConfiguration, getExternalFormat, getResolution, INJECT_FLUID_CONFIGURATION, Programs } from './model';
import { compileShaders } from './shaders';

@Injectable()
export class FluidService {

  private _renderingContext!: WebGL2RenderingContext;
  private _configuration: FluidConfiguration;

  private _compiledShaders!: CompiledShaders;
  private _programs!: Programs;
  private _material!: Material;
  private _externalFormat!: ExternalFormat;

  private _dye!: DoubleFrameBuffer;
  private _velocity!: DoubleFrameBuffer;
  private _divergence!: FrameBuffer;
  private _curl!: FrameBuffer;
  private _pressure!: DoubleFrameBuffer;
  private _bloom!: FrameBuffer;
  private _blooms!: FrameBuffer[];
  private _sunrays!: FrameBuffer;
  private _sunraysTemp!: FrameBuffer;

  constructor(@Optional() @Inject(INJECT_FLUID_CONFIGURATION) configuration: Partial<FluidConfiguration>) {
    this._configuration = { ...DEFAULT_FLUID_CONFIGURATION, ...configuration };
  }

  public bind(renderingContext: WebGL2RenderingContext) {
    this._renderingContext = renderingContext;
    this._externalFormat = getExternalFormat(renderingContext);

    this._initialize();
  }

  private _initialize(): void {
    this._compiledShaders = compileShaders(this._renderingContext);
    this._programs = createPrograms(this._renderingContext, this._compiledShaders);
    this._material = createMaterial(this._renderingContext, this._compiledShaders.baseVertexShader);

    this._updatekeywords();

    this._initFramebuffers();

    console.log(this);
  }

  private _updatekeywords(): void {
    const { shading, bloom, sunrays } = this._configuration;

    const displayKeywords = [];
    if (shading) {
      displayKeywords.push('SHADING');
    }
    if (bloom) {
      displayKeywords.push('BLOOM');
    }
    if (sunrays) {
      displayKeywords.push('SUNRAYS');
    }

    this._material.setKeywords(displayKeywords);
  }

  private _initFramebuffers(): void {
    // this might be called on resize (?)
    const { BLEND, HALF_FLOAT, LINEAR, NEAREST } = this._renderingContext;
    const { formatRGBA, formatRG, formatR } = this._externalFormat;
    const { simResolution, dyeResolution, bloomResolution, sunraysResolution, bloomIterations } = this._configuration;
    const simRes = getResolution(this._renderingContext, simResolution);
    const dyeRes = getResolution(this._renderingContext, dyeResolution);
    const bloomRes = getResolution(this._renderingContext, bloomResolution);
    const sunRaysRes = getResolution(this._renderingContext, sunraysResolution);

    this._renderingContext.disable(BLEND);

    this._dye = this._dye
      ? this._resizeDoubleFBO(this._dye, this._renderingContext, dyeRes, formatRGBA?.internalFormat ?? -1, formatRGBA?.format ?? -1, HALF_FLOAT, LINEAR)
      : new DoubleFrameBuffer(this._renderingContext, dyeRes, formatRGBA?.internalFormat ?? -1, formatRGBA?.format ?? -1, HALF_FLOAT, LINEAR);

    this._velocity = this._velocity
      ? this._resizeDoubleFBO(this._velocity, this._renderingContext, simRes, formatRG?.internalFormat ?? -1, formatRG?.format ?? -1, HALF_FLOAT, LINEAR)
      : new DoubleFrameBuffer(this._renderingContext, simRes, formatRG?.internalFormat ?? -1, formatRG?.format ?? -1, HALF_FLOAT, LINEAR);

    this._divergence = new FrameBuffer(this._renderingContext, simRes, formatR?.internalFormat ?? -1, formatR?.format ?? -1, HALF_FLOAT, NEAREST);
    this._curl = new FrameBuffer(this._renderingContext, simRes, formatR?.internalFormat ?? -1, formatR?.format ?? -1, HALF_FLOAT, NEAREST);
    this._pressure = new DoubleFrameBuffer(this._renderingContext, simRes, formatR?.internalFormat ?? -1, formatR?.format ?? -1, HALF_FLOAT, NEAREST);
    this._sunrays = new FrameBuffer(this._renderingContext, sunRaysRes, formatR?.internalFormat ?? -1, formatR?.format ?? -1, HALF_FLOAT, NEAREST);
    this._sunraysTemp = new FrameBuffer(this._renderingContext, sunRaysRes, formatR?.internalFormat ?? -1, formatR?.format ?? -1, HALF_FLOAT, NEAREST);
    this._bloom = new FrameBuffer(this._renderingContext, bloomRes, formatRGBA?.internalFormat ?? -1, formatRGBA?.format ?? -1, HALF_FLOAT, NEAREST);
    this._blooms = [];
    for (let i = 0; i < bloomIterations; i++) {
      let { width, height } = bloomRes;
      // eslint-disable-next-line no-bitwise
      width = width >> (i + 1);
      // eslint-disable-next-line no-bitwise
      height = height >> (i + 1);

      if (width < 2 || height < 2) {
        break;
      }

      const bloom = new FrameBuffer(this._renderingContext, { width, height }, formatRGBA?.internalFormat ?? -1, formatRGBA?.format ?? -1, HALF_FLOAT, NEAREST);
      this._blooms.push(bloom);
    }
  }

  private _resizeFBO(
    target: FrameBuffer, renderingContext: WebGL2RenderingContext, dimensions: Dimensions, internalFormat: number, format: number, type: number, param: number
  ): FrameBuffer {
    const { copyProgram } = this._programs as Programs;
    const newFBO = new FrameBuffer(renderingContext, dimensions, internalFormat, format, type, param);

    copyProgram.bind();
    renderingContext.uniform1i(copyProgram.uniforms.get('uTexture') ?? null, target.attach(0));
    this._blit(renderingContext)(newFBO);
    return newFBO;
  }

  private _resizeDoubleFBO(
    target: DoubleFrameBuffer, renderingContext: WebGL2RenderingContext, dimensions: Dimensions, internalFormat: number, format: number, type: number, param: number
  ): DoubleFrameBuffer {
    const { width, height } = dimensions;
    if (target.width === width && target.height === height) {
      return target;
    }

    target.read = this._resizeFBO(target.read, renderingContext, dimensions, internalFormat, format, type, param);
    target.write = new FrameBuffer(renderingContext, dimensions, internalFormat, format, type, param);
    return target;
  }

  private _blit(renderingContext: WebGL2RenderingContext): (target: FrameBuffer, clear?: boolean) => void {
    const { ARRAY_BUFFER, ELEMENT_ARRAY_BUFFER, STATIC_DRAW, FLOAT, FRAMEBUFFER, COLOR_BUFFER_BIT, TRIANGLES, UNSIGNED_SHORT } = renderingContext;
    renderingContext.bindBuffer(ARRAY_BUFFER, renderingContext.createBuffer());
    renderingContext.bufferData(ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), STATIC_DRAW);
    renderingContext.bindBuffer(ELEMENT_ARRAY_BUFFER, renderingContext.createBuffer());
    renderingContext.bufferData(ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), STATIC_DRAW);
    renderingContext.vertexAttribPointer(0, 2, FLOAT, false, 0, 0);
    renderingContext.enableVertexAttribArray(0);

    return (target, clear = false) => {
      if (!target) {
        renderingContext.viewport(0, 0, renderingContext.drawingBufferWidth, renderingContext.drawingBufferHeight);
        renderingContext.bindFramebuffer(FRAMEBUFFER, null);
      } else {
        renderingContext.viewport(0, 0, target.width, target.height);
        renderingContext.bindFramebuffer(FRAMEBUFFER, target.frameBufferObject);
      }

      if (clear) {
        renderingContext.clearColor(0, 0, 0, 1);
        renderingContext.clear(COLOR_BUFFER_BIT);
      }

      renderingContext.drawElements(TRIANGLES, 6, UNSIGNED_SHORT, 0);
    };
  };

}
