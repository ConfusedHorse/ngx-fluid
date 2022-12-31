import { Inject, Injectable, Optional } from '@angular/core';
import { scaleByPixelRatio } from '../resize/model';
import { getRandomColor, normalizeColor, WeirdColor } from './color';
import { DoubleFrameBuffer, FrameBuffer } from './frameBuffer';
import { Material } from './material';
import { CompiledShaders, createMaterial, createPrograms, DEFAULT_FLUID_CONFIGURATION, Dimensions, ExternalFormat, FluidConfiguration, getExternalFormat, getResolution, INJECT_FLUID_CONFIGURATION, Programs } from './model';
import { compileShaders } from './shaders';
import { DitheringTexture } from './texture';

@Injectable()
export class FluidService {

  private _renderingContext!: WebGL2RenderingContext;
  private _configuration: FluidConfiguration;

  private _compiledShaders!: CompiledShaders;
  private _programs!: Programs;
  private _displayMaterial!: Material;
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

  private _ditheringTexture!: DitheringTexture;

  private _lastUpdateTime = Date.now();

  constructor(@Optional() @Inject(INJECT_FLUID_CONFIGURATION) configuration: Partial<FluidConfiguration>) {
    this._configuration = { ...DEFAULT_FLUID_CONFIGURATION, ...configuration };
  }

  public bind(renderingContext: WebGL2RenderingContext) {
    this._renderingContext = renderingContext;
    this._externalFormat = getExternalFormat(renderingContext);

    this._initialize();

    this.multipleSplats(Math.random() * 20 + 5);
    requestAnimationFrame(this.update.bind(this));
  }

  public update(): void {
    // TODO this should be handled by an observable
    const delta = this._calcDeltaTime();

    if (this._resizeCanvas()) {
      this._initFramebuffers();
    }

    this._step(delta);
    this._render(null);
    requestAnimationFrame(this.update.bind(this));
  }

  public splat(x: number, y: number, dx: number, dy: number, color: WeirdColor): void {
    const { splatProgram } = this._programs;
    const { canvas } = this._renderingContext;

    splatProgram.bind();
    this._renderingContext.uniform1i(splatProgram.uniforms.get('uTarget') ?? null, this._velocity.read.attach(0));
    this._renderingContext.uniform1f(splatProgram.uniforms.get('aspectRatio') ?? null, canvas.width / canvas.height);
    this._renderingContext.uniform2f(splatProgram.uniforms.get('point') ?? null, x, y);
    this._renderingContext.uniform3f(splatProgram.uniforms.get('color') ?? null, dx, dy, 0);
    this._renderingContext.uniform1f(splatProgram.uniforms.get('radius') ?? null, this._correctRadius(this._configuration.splatRadius * .01));
    this._blitFramebuffer(this._velocity.write);
    this._velocity.swap();

    this._renderingContext.uniform1i(splatProgram.uniforms.get('uTarget') ?? null, this._dye.read.attach(0));
    this._renderingContext.uniform3f(splatProgram.uniforms.get('color') ?? null, color.r, color.g, color.b);
    this._blitFramebuffer(this._dye.write);
    this._dye.swap();
  }

  public multipleSplats(amount: number): void {
    for (let i = 0; i < amount; i++) {
      const color = getRandomColor();
      color.r *= 10;
      color.g *= 10;
      color.b *= 10;

      const x = Math.random();
      const y = Math.random();
      const dx = 1000 * (Math.random() - .5);
      const dy = 1000 * (Math.random() - .5);

      this.splat(x, y, dx, dy, color);
    }
  }

  private _initialize(): void {
    // TODO something still doesn't work :(
    this._compiledShaders = compileShaders(this._renderingContext);
    this._programs = createPrograms(this._renderingContext, this._compiledShaders);
    this._displayMaterial = createMaterial(this._renderingContext, this._compiledShaders.baseVertexShader);

    this._initializeBlit();
    this._initializeTexture();

    this._updatekeywords();
    this._initFramebuffers();
  }

  private _splatPointer(pointerEvent: PointerEvent) {
    // const dx = pointerEvent.movementX * this._configuration.splatForce;
    // const dy = pointerEvent.movementY * this._configuration.splatForce;
    // splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
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
      : new DoubleFrameBuffer(this._renderingContext, dyeRes, formatRGBA.internalFormat, formatRGBA.format, HALF_FLOAT, LINEAR);

    this._velocity = this._velocity
      ? this._resizeDoubleFBO(this._velocity, simRes, formatRG.internalFormat, formatRG.format, HALF_FLOAT, LINEAR)
      : new DoubleFrameBuffer(this._renderingContext, simRes, formatRG.internalFormat, formatRG.format, HALF_FLOAT, LINEAR);

    this._divergence = new FrameBuffer(this._renderingContext, simRes, formatR.internalFormat, formatR.format, HALF_FLOAT, NEAREST);
    this._curl = new FrameBuffer(this._renderingContext, simRes, formatR.internalFormat, formatR.format, HALF_FLOAT, NEAREST);
    this._pressure = new DoubleFrameBuffer(this._renderingContext, simRes, formatR.internalFormat, formatR.format, HALF_FLOAT, NEAREST);

    this._sunrays = new FrameBuffer(this._renderingContext, sunRaysRes, formatR.internalFormat, formatR.format, HALF_FLOAT, NEAREST);
    this._sunraysTemp = new FrameBuffer(this._renderingContext, sunRaysRes, formatR.internalFormat, formatR.format, HALF_FLOAT, NEAREST);

    this._bloom = new FrameBuffer(this._renderingContext, bloomRes, formatRGBA.internalFormat, formatRGBA.format, HALF_FLOAT, NEAREST);
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

      const bloom = new FrameBuffer(this._renderingContext, { width, height }, formatRGBA.internalFormat, formatRGBA.format, HALF_FLOAT, NEAREST);
      this._blooms.push(bloom);
    }
  }

  private _step(deltaTime: number): void {
    const { BLEND } = this._renderingContext;
    const { curlProgram, vorticityProgram, divergenceProgram, clearProgram, pressureProgram, gradienSubtractProgram, advectionProgram } = this._programs;

    this._renderingContext.disable(BLEND);

    curlProgram.bind();
    this._renderingContext.uniform2f(curlProgram.uniforms.get('texelSize') ?? null, this._velocity.texelSizeX, this._velocity.texelSizeY);
    this._renderingContext.uniform1i(curlProgram.uniforms.get('uVelocity') ?? null, this._velocity.read.attach(0));
    this._blitFramebuffer(this._curl);

    vorticityProgram.bind();
    this._renderingContext.uniform2f(vorticityProgram.uniforms.get('texelSize') ?? null, this._velocity.texelSizeX, this._velocity.texelSizeY);
    this._renderingContext.uniform1i(vorticityProgram.uniforms.get('uVelocity') ?? null, this._velocity.read.attach(0));
    this._renderingContext.uniform1i(vorticityProgram.uniforms.get('uCurl') ?? null, this._curl.attach(1));
    this._renderingContext.uniform1f(vorticityProgram.uniforms.get('curl') ?? null, this._configuration.curl);
    this._renderingContext.uniform1f(vorticityProgram.uniforms.get('dt') ?? null, deltaTime);
    this._blitFramebuffer(this._velocity.write);
    this._velocity.swap();

    divergenceProgram.bind();
    this._renderingContext.uniform2f(divergenceProgram.uniforms.get('texelSize') ?? null, this._velocity.texelSizeX, this._velocity.texelSizeY);
    this._renderingContext.uniform1i(divergenceProgram.uniforms.get('uVelocity') ?? null, this._velocity.read.attach(0));
    this._blitFramebuffer(this._divergence);

    clearProgram.bind();
    this._renderingContext.uniform1i(clearProgram.uniforms.get('uTexture') ?? null, this._pressure.read.attach(0));
    this._renderingContext.uniform1f(clearProgram.uniforms.get('value') ?? null, this._configuration.pressure);
    this._blitFramebuffer(this._pressure.write);
    this._pressure.swap();

    pressureProgram.bind();
    this._renderingContext.uniform2f(pressureProgram.uniforms.get('texelSize') ?? null, this._velocity.texelSizeX, this._velocity.texelSizeY);
    this._renderingContext.uniform1i(pressureProgram.uniforms.get('uDivergence') ?? null, this._divergence.attach(0));
    for (let i = 0; i < this._configuration.pressureIterations; i++) {
      this._renderingContext.uniform1i(pressureProgram.uniforms.get('uPressure') ?? null, this._pressure.read.attach(1));
      this._blitFramebuffer(this._pressure.write);
      this._pressure.swap();
    }

    gradienSubtractProgram.bind();
    this._renderingContext.uniform2f(gradienSubtractProgram.uniforms.get('texelSize') ?? null, this._velocity.texelSizeX, this._velocity.texelSizeY);
    this._renderingContext.uniform1i(gradienSubtractProgram.uniforms.get('uPressure') ?? null, this._pressure.read.attach(0));
    this._renderingContext.uniform1i(gradienSubtractProgram.uniforms.get('uVelocity') ?? null, this._velocity.read.attach(1));
    this._blitFramebuffer(this._velocity.write);
    this._velocity.swap();

    advectionProgram.bind();
    this._renderingContext.uniform2f(advectionProgram.uniforms.get('texelSize') ?? null, this._velocity.texelSizeX, this._velocity.texelSizeY);
    const velocityId = this._velocity.read.attach(0);
    this._renderingContext.uniform1i(advectionProgram.uniforms.get('uVelocity') ?? null, velocityId);
    this._renderingContext.uniform1i(advectionProgram.uniforms.get('uSource') ?? null, velocityId);
    this._renderingContext.uniform1f(advectionProgram.uniforms.get('dt') ?? null, deltaTime);
    this._renderingContext.uniform1f(advectionProgram.uniforms.get('dissipation') ?? null, this._configuration.velocityDissipation);
    this._blitFramebuffer(this._velocity.write);
    this._velocity.swap();

    this._renderingContext.uniform1i(advectionProgram.uniforms.get('uVelocity') ?? null, this._velocity.read.attach(0));
    this._renderingContext.uniform1i(advectionProgram.uniforms.get('uSource') ?? null, this._dye.read.attach(1));
    this._renderingContext.uniform1f(advectionProgram.uniforms.get('dissipation') ?? null, this._configuration.densityDissipation);
    this._blitFramebuffer(this._dye.write);
    this._dye.swap();
  }

  private _render(target: FrameBuffer | null = null): void {
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

    if (target === null && this._configuration.transparent) {
      this._drawCheckerboard(target); // meh?
    }

    this._drawDisplay(target);
  }

  private _applyBloom(source: FrameBuffer, destination: FrameBuffer): void {
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

    this._renderingContext.uniform3f(bloomPrefilterProgram.uniforms.get('curve') ?? null, curve0, curve1, curve2);
    this._renderingContext.uniform1f(bloomPrefilterProgram.uniforms.get('threshold') ?? null, bloomThreshold);
    this._renderingContext.uniform1i(bloomPrefilterProgram.uniforms.get('uTexture') ?? null, source.attach(0));
    this._blitFramebuffer(last);

    bloomBlurProgram.bind();

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < this._blooms.length; i++) {
      const dest = this._blooms[i];
      this._renderingContext.uniform2f(bloomBlurProgram.uniforms.get('texelSize') ?? null, last.texelSizeX, last.texelSizeY);
      this._renderingContext.uniform1i(bloomBlurProgram.uniforms.get('uTexture') ?? null, last.attach(0));
      this._blitFramebuffer(dest);
      last = dest;
    }

    this._renderingContext.blendFunc(ONE, ONE);
    this._renderingContext.enable(BLEND);

    for (let i = this._blooms.length - 2; i >= 0; i--) {
      const baseTex = this._blooms[i];
      this._renderingContext.uniform2f(bloomBlurProgram.uniforms.get('texelSize') ?? null, last.texelSizeX, last.texelSizeY);
      this._renderingContext.uniform1i(bloomBlurProgram.uniforms.get('uTexture') ?? null, last.attach(0));
      this._renderingContext.viewport(0, 0, baseTex.width, baseTex.height);
      this._blitFramebuffer(baseTex);
      last = baseTex;
    }

    this._renderingContext.disable(BLEND);
    bloomFinalProgram.bind();

    this._renderingContext.uniform2f(bloomFinalProgram.uniforms.get('texelSize') ?? null, last.texelSizeX, last.texelSizeY);
    this._renderingContext.uniform1i(bloomFinalProgram.uniforms.get('uTexture') ?? null, last.attach(0));
    this._renderingContext.uniform1f(bloomFinalProgram.uniforms.get('intensity') ?? null, bloomIntensity);
    this._blitFramebuffer(destination);
  }

  private _applySunrays(source: FrameBuffer, mask: FrameBuffer, destination: FrameBuffer): void {
    const { BLEND } = this._renderingContext;
    const { sunraysWeight } = this._configuration;
    const { sunraysMaskProgram, sunraysProgram } = this._programs;

    this._renderingContext.disable(BLEND);
    sunraysMaskProgram.bind();
    this._renderingContext.uniform1i(sunraysMaskProgram.uniforms.get('uTexture') ?? null, source.attach(0));
    this._blitFramebuffer(mask);

    sunraysProgram.bind();
    this._renderingContext.uniform1f(sunraysProgram.uniforms.get('weight') ?? null, sunraysWeight);
    this._renderingContext.uniform1i(sunraysProgram.uniforms.get('uTexture') ?? null, mask.attach(0));
    this._blitFramebuffer(destination);
  }

  private _blur(target: FrameBuffer, temp: FrameBuffer, iterations: number): void {
    const { blurProgram } = this._programs;

    blurProgram.bind();
    for (let i = 0; i < iterations; i++) {
      this._renderingContext.uniform2f(blurProgram.uniforms.get('texelSize') ?? null, target.texelSizeX, 0);
      this._renderingContext.uniform1i(blurProgram.uniforms.get('uTexture') ?? null, target.attach(0));
      this._blitFramebuffer(temp);

      this._renderingContext.uniform2f(blurProgram.uniforms.get('texelSize') ?? null, 0, target.texelSizeY);
      this._renderingContext.uniform1i(blurProgram.uniforms.get('uTexture') ?? null, temp.attach(0));
      this._blitFramebuffer(target);
    }
  }

  private _drawColor(target: FrameBuffer | null, color: WeirdColor): void {
    const { colorProgram } = this._programs;

    colorProgram.bind();
    this._renderingContext.uniform4f(colorProgram.uniforms.get('color') ?? null, color.r, color.g, color.b, 1);

    this._blitFramebuffer(target);
  }

  private _drawCheckerboard(target: FrameBuffer | null): void {
    const { checkerboardProgram } = this._programs;
    const { canvas } = this._renderingContext;

    checkerboardProgram.bind();
    this._renderingContext.uniform1f(checkerboardProgram.uniforms.get('aspectRatio') ?? null, canvas.width / canvas.height);

    this._blitFramebuffer(target);
  }

  private _drawDisplay(target: FrameBuffer | null) {
    const { drawingBufferWidth, drawingBufferHeight } = this._renderingContext;
    const { shading, bloom, sunrays } = this._configuration;

    const width = target ? target.width : drawingBufferWidth;
    const height = target ? target.height : drawingBufferHeight;

    this._displayMaterial.bind();
    if (shading) {
      this._renderingContext.uniform2f(this._displayMaterial.uniforms.get('texelSize') ?? null, 1 / width, 1 / height);
    }

    this._renderingContext.uniform1i(this._displayMaterial.uniforms.get('uTexture') ?? null, this._dye.read.attach(0));

    if (bloom) {
      this._renderingContext.uniform1i(this._displayMaterial.uniforms.get('uBloom') ?? null, this._bloom.attach(1));
      this._renderingContext.uniform1i(this._displayMaterial.uniforms.get('uDithering') ?? null, this._ditheringTexture.attach(2));
      const scale = this._getTextureScale(this._ditheringTexture, width, height);
      this._renderingContext.uniform2f(this._displayMaterial.uniforms.get('ditherScale') ?? null, scale.width, scale.height);
    }

    if (sunrays) {
      this._renderingContext.uniform1i(this._displayMaterial.uniforms.get('uSunrays') ?? null, this._sunrays.attach(3));
    }

    this._blitFramebuffer(target);
  }

  private _resizeFBO(target: FrameBuffer, dimensions: Dimensions, internalFormat: number, format: number, type: number, param: number): FrameBuffer {
    const { copyProgram } = this._programs as Programs;
    const newFBO = new FrameBuffer(this._renderingContext, dimensions, internalFormat, format, type, param);

    copyProgram.bind();
    this._renderingContext.uniform1i(copyProgram.uniforms.get('uTexture') ?? null, target.attach(0));
    this._blitFramebuffer(newFBO);

    return newFBO;
  }

  private _resizeDoubleFBO(target: DoubleFrameBuffer, dimensions: Dimensions, internalFormat: number, format: number, type: number, param: number): DoubleFrameBuffer {
    const { width, height } = dimensions;
    if (target.width === width && target.height === height) {
      return target;
    }

    target.read = this._resizeFBO(target.read, dimensions, internalFormat, format, type, param);
    target.write = new FrameBuffer(this._renderingContext, dimensions, internalFormat, format, type, param);
    return target;
  }

  private _blitFramebuffer(target: FrameBuffer | null): void {
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
    this._ditheringTexture = new DitheringTexture(this._renderingContext);
  }

  private _getTextureScale(ditheringTexture: DitheringTexture, width: number, height: number): Dimensions {
    return {
      width: width / ditheringTexture.width,
      height: height / ditheringTexture.height
    };
  }

  private _resizeCanvas(): boolean {
    const canvas = this._renderingContext.canvas as HTMLCanvasElement;

    const width = scaleByPixelRatio(canvas.clientWidth);
    const height = scaleByPixelRatio(canvas.clientHeight);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;

      return true;
    }

    return false;
  }

  private _correctRadius(radius: number): number {
    const { canvas } = this._renderingContext;
    const aspectRatio = canvas.width / canvas.height;

    if (aspectRatio > 1) {
      radius *= aspectRatio;
    }

    return radius;
  }

  private _calcDeltaTime() {
    const now = Date.now();

    let delta = (now - this._lastUpdateTime) * .001;
    delta = Math.min(delta, .016666);
    this._lastUpdateTime = now;

    return delta;
  }

}
