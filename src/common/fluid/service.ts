import { Injectable } from '@angular/core';
import { DoubleFrameBufferEntity, FrameBufferEntity } from './entities/frameBuffer';
import { MaterialEntity } from './entities/material';
import { DitheringTextureEntity } from './entities/texture';
import { getExternalFormat, normalizeColor } from './helpers/color';
import { getResolution, getTextureScale, resizeCanvas } from './helpers/dimension';
import { createMaterial } from './helpers/material';
import { createPrograms } from './helpers/program';
import { compileShaders } from './helpers/shaders';
import { ExternalFormat, Rgb } from './model/color';
import { Configuration, FluidConfiguration } from './model/configuration';
import { Dimension, TexMovement } from './model/dimension';
import { Programs } from './model/program';
import { CompiledShaders } from './model/shaders';

@Injectable()
export class FluidService {

  private _renderingContext!: WebGL2RenderingContext;
  private readonly _configuration: FluidConfiguration = Configuration();

  private _compiledShaders!: CompiledShaders;
  private _programs!: Programs;
  private _displayMaterial!: MaterialEntity;
  private _externalFormat!: ExternalFormat;

  private _dye!: DoubleFrameBufferEntity;
  private _velocity!: DoubleFrameBufferEntity;
  private _divergence!: FrameBufferEntity;
  private _curl!: FrameBufferEntity;
  private _pressure!: DoubleFrameBufferEntity;
  private _bloom!: FrameBufferEntity;
  private _blooms!: FrameBufferEntity[];
  private _sunrays!: FrameBufferEntity;
  private _sunraysTemp!: FrameBufferEntity;

  private _ditheringTexture!: DitheringTextureEntity;

  private _lastUpdateTime = Date.now();

  public get canvas(): HTMLCanvasElement | OffscreenCanvas {
    return this._renderingContext.canvas;
  }

  public bind(renderingContext: WebGL2RenderingContext) {
    if (this._renderingContext) {
      throw Error('rendering context has already been set!');
    }

    this._renderingContext = renderingContext;
    this._externalFormat = getExternalFormat(renderingContext);

    this._initialize();
  }

  public splatMovement(texMovement: TexMovement, color: Rgb): void {
    const { splatForce } = this._configuration;

    const dx = texMovement.deltaX * splatForce;
    const dy = texMovement.deltaY * splatForce;
    this.splat(texMovement.x, texMovement.y, dx, dy, color);
  }

  public splat(x: number, y: number, dx: number, dy: number, color: Rgb): void {
    if (!this._renderingContext) {
      throw Error('rendering context has not been set! Use bind() to provide a rendering context.');
    }

    const { splatProgram } = this._programs;
    const { canvas } = this;

    splatProgram.bind();
    this._renderingContext.uniform1i(splatProgram.uniforms['uTarget'], this._velocity.read.attach(0));
    this._renderingContext.uniform1f(splatProgram.uniforms['aspectRatio'], canvas.width / canvas.height);
    this._renderingContext.uniform2f(splatProgram.uniforms['point'], x, y);
    this._renderingContext.uniform3f(splatProgram.uniforms['color'], dx, dy, 0);
    this._renderingContext.uniform1f(splatProgram.uniforms['radius'], this._correctRadius(this._configuration.splatRadius * .01));
    this._blitFramebuffer(this._velocity.write);
    this._velocity.swap();

    this._renderingContext.uniform1i(splatProgram.uniforms['uTarget'], this._dye.read.attach(0));
    this._renderingContext.uniform3f(splatProgram.uniforms['color'], color.r, color.g, color.b);
    this._blitFramebuffer(this._dye.write);
    this._dye.swap();
  }

  private _initialize(): void {
    this._compiledShaders = compileShaders(this._renderingContext);
    this._programs = createPrograms(this._renderingContext, this._compiledShaders);
    this._displayMaterial = createMaterial(this._renderingContext, this._compiledShaders.baseVertexShader);

    this._initializeBlit();
    this._initializeTexture();
    this._updatekeywords();
    this._initFramebuffers();

    requestAnimationFrame(this._update.bind(this));
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

    this._displayMaterial.setKeywords(displayKeywords);
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
      ? this._resizeDoubleFBO(this._dye, dyeRes, formatRGBA.internalFormat, formatRGBA.format, HALF_FLOAT, LINEAR)
      : new DoubleFrameBufferEntity(this._renderingContext, dyeRes, formatRGBA.internalFormat, formatRGBA.format, HALF_FLOAT, LINEAR);

    this._velocity = this._velocity
      ? this._resizeDoubleFBO(this._velocity, simRes, formatRG.internalFormat, formatRG.format, HALF_FLOAT, LINEAR)
      : new DoubleFrameBufferEntity(this._renderingContext, simRes, formatRG.internalFormat, formatRG.format, HALF_FLOAT, LINEAR);

    this._divergence = new FrameBufferEntity(this._renderingContext, simRes, formatR.internalFormat, formatR.format, HALF_FLOAT, NEAREST);
    this._curl = new FrameBufferEntity(this._renderingContext, simRes, formatR.internalFormat, formatR.format, HALF_FLOAT, NEAREST);
    this._pressure = new DoubleFrameBufferEntity(this._renderingContext, simRes, formatR.internalFormat, formatR.format, HALF_FLOAT, NEAREST);

    this._bloom = new FrameBufferEntity(this._renderingContext, bloomRes, formatRGBA.internalFormat, formatRGBA.format, HALF_FLOAT, LINEAR);
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

      const bloom = new FrameBufferEntity(this._renderingContext, { width, height }, formatRGBA.internalFormat, formatRGBA.format, HALF_FLOAT, LINEAR);
      this._blooms.push(bloom);

      this._sunrays = new FrameBufferEntity(this._renderingContext, sunRaysRes, formatR.internalFormat, formatR.format, HALF_FLOAT, LINEAR);
      this._sunraysTemp = new FrameBufferEntity(this._renderingContext, sunRaysRes, formatR.internalFormat, formatR.format, HALF_FLOAT, LINEAR);
    }
  }

  private _update(): void {
    const delta = this._calcDeltaTime();

    if (resizeCanvas(this.canvas)) {
      this._initFramebuffers();
    }

    this._step(delta);
    this._render(null);
    requestAnimationFrame(this._update.bind(this));
  }

  private _step(deltaTime: number): void {
    const { BLEND } = this._renderingContext;
    const { curlProgram, vorticityProgram, divergenceProgram, clearProgram, pressureProgram, gradienSubtractProgram, advectionProgram } = this._programs;

    this._renderingContext.disable(BLEND);

    curlProgram.bind();
    this._renderingContext.uniform2f(curlProgram.uniforms['texelSize'], this._velocity.texelSizeX, this._velocity.texelSizeY);
    this._renderingContext.uniform1i(curlProgram.uniforms['uVelocity'], this._velocity.read.attach(0));
    this._blitFramebuffer(this._curl);

    vorticityProgram.bind();
    this._renderingContext.uniform2f(vorticityProgram.uniforms['texelSize'], this._velocity.texelSizeX, this._velocity.texelSizeY);
    this._renderingContext.uniform1i(vorticityProgram.uniforms['uVelocity'], this._velocity.read.attach(0));
    this._renderingContext.uniform1i(vorticityProgram.uniforms['uCurl'], this._curl.attach(1));
    this._renderingContext.uniform1f(vorticityProgram.uniforms['curl'], this._configuration.curl);
    this._renderingContext.uniform1f(vorticityProgram.uniforms['dt'], deltaTime);
    this._blitFramebuffer(this._velocity.write);
    this._velocity.swap();

    divergenceProgram.bind();
    this._renderingContext.uniform2f(divergenceProgram.uniforms['texelSize'], this._velocity.texelSizeX, this._velocity.texelSizeY);
    this._renderingContext.uniform1i(divergenceProgram.uniforms['uVelocity'], this._velocity.read.attach(0));
    this._blitFramebuffer(this._divergence);

    // disabled for watery appearance
    clearProgram.bind();
    this._renderingContext.uniform1i(clearProgram.uniforms['uTexture'], this._pressure.read.attach(0));
    this._renderingContext.uniform1f(clearProgram.uniforms['value'], this._configuration.pressure);
    this._blitFramebuffer(this._pressure.write);
    this._pressure.swap();

    pressureProgram.bind();
    this._renderingContext.uniform2f(pressureProgram.uniforms['texelSize'], this._velocity.texelSizeX, this._velocity.texelSizeY);
    this._renderingContext.uniform1i(pressureProgram.uniforms['uDivergence'], this._divergence.attach(0));
    for (let i = 0; i < this._configuration.pressureIterations; i++) {
      this._renderingContext.uniform1i(pressureProgram.uniforms['uPressure'], this._pressure.read.attach(1));
      this._blitFramebuffer(this._pressure.write);
      this._pressure.swap();
    }

    gradienSubtractProgram.bind();
    this._renderingContext.uniform2f(gradienSubtractProgram.uniforms['texelSize'], this._velocity.texelSizeX, this._velocity.texelSizeY);
    this._renderingContext.uniform1i(gradienSubtractProgram.uniforms['uPressure'], this._pressure.read.attach(0));
    this._renderingContext.uniform1i(gradienSubtractProgram.uniforms['uVelocity'], this._velocity.read.attach(1));
    this._blitFramebuffer(this._velocity.write);
    this._velocity.swap();

    advectionProgram.bind();
    this._renderingContext.uniform2f(advectionProgram.uniforms['texelSize'], this._velocity.texelSizeX, this._velocity.texelSizeY);
    const velocityId = this._velocity.read.attach(0);
    this._renderingContext.uniform1i(advectionProgram.uniforms['uVelocity'], velocityId);
    this._renderingContext.uniform1i(advectionProgram.uniforms['uSource'], velocityId);
    this._renderingContext.uniform1f(advectionProgram.uniforms['dt'], deltaTime);
    this._renderingContext.uniform1f(advectionProgram.uniforms['dissipation'], this._configuration.velocityDissipation);
    this._blitFramebuffer(this._velocity.write);
    this._velocity.swap();

    this._renderingContext.uniform1i(advectionProgram.uniforms['uVelocity'], this._velocity.read.attach(0));
    this._renderingContext.uniform1i(advectionProgram.uniforms['uSource'], this._dye.read.attach(1));
    this._renderingContext.uniform1f(advectionProgram.uniforms['dissipation'], this._configuration.densityDissipation);
    this._blitFramebuffer(this._dye.write);
    this._dye.swap();
  }

  private _render(target: FrameBufferEntity | null = null): void {
    const { ONE, ONE_MINUS_SRC_ALPHA, BLEND } = this._renderingContext;

    if (this._configuration.bloom) {
      this._applyBloom(this._dye.read, this._bloom);
    }

    if (this._configuration.sunrays) {
      this._applySunrays(this._dye.read, this._dye.write, this._sunrays);
      this._blur(this._sunrays, this._sunraysTemp, 1);
    }

    if (!target || !this._configuration.transparent) {
      this._renderingContext.blendFunc(ONE, ONE_MINUS_SRC_ALPHA);
      this._renderingContext.enable(BLEND);
    } else {
      this._renderingContext.disable(BLEND);
    }

    if (!this._configuration.transparent) {
      this._drawColor(target, normalizeColor(this._configuration.backColor));
    }

    this._drawDisplay(target);
  }

  private _applyBloom(source: FrameBufferEntity, destination: FrameBufferEntity): void {
    if (this._blooms.length < 2) {
      return;
    }

    const { BLEND, ONE } = this._renderingContext;
    const { bloomThreshold, bloomSoftKnee, bloomIntensity } = this._configuration;
    const { bloomPrefilterProgram, bloomBlurProgram, bloomFinalProgram } = this._programs;

    let last = destination;

    this._renderingContext.disable(BLEND);
    bloomPrefilterProgram.bind();

    const knee = bloomThreshold * bloomSoftKnee + 0.0001;
    const curve0 = bloomThreshold - knee;
    const curve1 = knee * 2;
    const curve2 = .25 / knee;

    this._renderingContext.uniform3f(bloomPrefilterProgram.uniforms['curve'], curve0, curve1, curve2);
    this._renderingContext.uniform1f(bloomPrefilterProgram.uniforms['threshold'], bloomThreshold);
    this._renderingContext.uniform1i(bloomPrefilterProgram.uniforms['uTexture'], source.attach(0));
    this._blitFramebuffer(last);

    bloomBlurProgram.bind();

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < this._blooms.length; i++) {
      const dest = this._blooms[i];
      this._renderingContext.uniform2f(bloomBlurProgram.uniforms['texelSize'], last.texelSizeX, last.texelSizeY);
      this._renderingContext.uniform1i(bloomBlurProgram.uniforms['uTexture'], last.attach(0));
      this._blitFramebuffer(dest);
      last = dest;
    }

    this._renderingContext.blendFunc(ONE, ONE);
    this._renderingContext.enable(BLEND);

    for (let i = this._blooms.length - 2; i >= 0; i--) {
      const baseTex = this._blooms[i];
      this._renderingContext.uniform2f(bloomBlurProgram.uniforms['texelSize'], last.texelSizeX, last.texelSizeY);
      this._renderingContext.uniform1i(bloomBlurProgram.uniforms['uTexture'], last.attach(0));
      this._renderingContext.viewport(0, 0, baseTex.width, baseTex.height);
      this._blitFramebuffer(baseTex);
      last = baseTex;
    }

    this._renderingContext.disable(BLEND);
    bloomFinalProgram.bind();

    this._renderingContext.uniform2f(bloomFinalProgram.uniforms['texelSize'], last.texelSizeX, last.texelSizeY);
    this._renderingContext.uniform1i(bloomFinalProgram.uniforms['uTexture'], last.attach(0));
    this._renderingContext.uniform1f(bloomFinalProgram.uniforms['intensity'], bloomIntensity);
    this._blitFramebuffer(destination);
  }

  private _applySunrays(source: FrameBufferEntity, mask: FrameBufferEntity, destination: FrameBufferEntity): void {
    const { BLEND } = this._renderingContext;
    const { sunraysWeight } = this._configuration;
    const { sunraysMaskProgram, sunraysProgram } = this._programs;

    this._renderingContext.disable(BLEND);
    sunraysMaskProgram.bind();
    this._renderingContext.uniform1i(sunraysMaskProgram.uniforms['uTexture'], source.attach(0));
    this._blitFramebuffer(mask);

    sunraysProgram.bind();
    this._renderingContext.uniform1f(sunraysProgram.uniforms['weight'], sunraysWeight);
    this._renderingContext.uniform1i(sunraysProgram.uniforms['uTexture'], mask.attach(0));
    this._blitFramebuffer(destination);
  }

  private _blur(target: FrameBufferEntity, temp: FrameBufferEntity, iterations: number): void {
    const { blurProgram } = this._programs;

    blurProgram.bind();
    for (let i = 0; i < iterations; i++) {
      this._renderingContext.uniform2f(blurProgram.uniforms['texelSize'], target.texelSizeX, 0);
      this._renderingContext.uniform1i(blurProgram.uniforms['uTexture'], target.attach(0));
      this._blitFramebuffer(temp);

      this._renderingContext.uniform2f(blurProgram.uniforms['texelSize'], 0, target.texelSizeY);
      this._renderingContext.uniform1i(blurProgram.uniforms['uTexture'], temp.attach(0));
      this._blitFramebuffer(target);
    }
  }

  private _drawColor(target: FrameBufferEntity | null, color: Rgb): void {
    const { colorProgram } = this._programs;

    colorProgram.bind();
    this._renderingContext.uniform4f(colorProgram.uniforms['color'], color.r, color.g, color.b, 1);

    this._blitFramebuffer(target);
  }

  private _drawDisplay(target: FrameBufferEntity | null) {
    const { drawingBufferWidth, drawingBufferHeight } = this._renderingContext;
    const { shading, bloom, sunrays } = this._configuration;

    const width = target ? target.width : drawingBufferWidth;
    const height = target ? target.height : drawingBufferHeight;

    this._displayMaterial.bind();
    if (shading) {
      this._renderingContext.uniform2f(this._displayMaterial.uniforms['texelSize'], 1 / width, 1 / height);
    }

    this._renderingContext.uniform1i(this._displayMaterial.uniforms['uTexture'], this._dye.read.attach(0));

    if (bloom) {
      this._renderingContext.uniform1i(this._displayMaterial.uniforms['uBloom'], this._bloom.attach(1));
      this._renderingContext.uniform1i(this._displayMaterial.uniforms['uDithering'], this._ditheringTexture.attach(2));
      const scale = getTextureScale(this._ditheringTexture, width, height);
      this._renderingContext.uniform2f(this._displayMaterial.uniforms['ditherScale'], scale.width, scale.height);
    }

    if (sunrays) {
      this._renderingContext.uniform1i(this._displayMaterial.uniforms['uSunrays'], this._sunrays.attach(3));
    }

    this._blitFramebuffer(target);
  }

  private _resizeFBO(target: FrameBufferEntity, dimensions: Dimension, internalFormat: number, format: number, type: number, param: number): FrameBufferEntity {
    const { copyProgram } = this._programs as Programs;
    const newFBO = new FrameBufferEntity(this._renderingContext, dimensions, internalFormat, format, type, param);

    copyProgram.bind();
    this._renderingContext.uniform1i(copyProgram.uniforms['uTexture'], target.attach(0));
    this._blitFramebuffer(newFBO);

    return newFBO;
  }

  private _resizeDoubleFBO(target: DoubleFrameBufferEntity, dimensions: Dimension, internalFormat: number, format: number, type: number, param: number): DoubleFrameBufferEntity {
    const { width, height } = dimensions;
    if (target.width === width && target.height === height) {
      return target;
    }

    target.read = this._resizeFBO(target.read, dimensions, internalFormat, format, type, param);
    target.write = new FrameBufferEntity(this._renderingContext, dimensions, internalFormat, format, type, param);
    return target;
  }

  private _blitFramebuffer(target: FrameBufferEntity | null): void {
    const { FRAMEBUFFER, TRIANGLES, UNSIGNED_SHORT } = this._renderingContext;

    if (!target) {
      this._renderingContext.viewport(0, 0, this._renderingContext.drawingBufferWidth, this._renderingContext.drawingBufferHeight);
      this._renderingContext.bindFramebuffer(FRAMEBUFFER, null);
    } else {
      this._renderingContext.viewport(0, 0, target.width, target.height);
      this._renderingContext.bindFramebuffer(FRAMEBUFFER, target.frameBufferObject);
    }

    this._renderingContext.drawElements(TRIANGLES, 6, UNSIGNED_SHORT, 0);
  };

  private _initializeBlit(): void {
    const { ARRAY_BUFFER, ELEMENT_ARRAY_BUFFER, STATIC_DRAW, FLOAT } = this._renderingContext;
    this._renderingContext.bindBuffer(ARRAY_BUFFER, this._renderingContext.createBuffer());
    this._renderingContext.bufferData(ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), STATIC_DRAW);
    this._renderingContext.bindBuffer(ELEMENT_ARRAY_BUFFER, this._renderingContext.createBuffer());
    this._renderingContext.bufferData(ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), STATIC_DRAW);
    this._renderingContext.vertexAttribPointer(0, 2, FLOAT, false, 0, 0);
    this._renderingContext.enableVertexAttribArray(0);
  }

  private _initializeTexture(): void {
    this._ditheringTexture = new DitheringTextureEntity(this._renderingContext);
  }

  private _correctRadius(radius: number): number {
    const { canvas } = this;
    const aspectRatio = canvas.width / canvas.height;

    if (aspectRatio > 1) {
      radius *= aspectRatio;
    }

    return radius;
  }

  private _calcDeltaTime() {
    const now = Date.now();

    let delta = (now - this._lastUpdateTime) * .001;
    delta = Math.min(delta, 1/60);
    this._lastUpdateTime = now;

    return delta;
  }

}
