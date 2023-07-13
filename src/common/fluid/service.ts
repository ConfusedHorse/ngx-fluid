import { Injectable } from '@angular/core';
import { DoubleFrameBufferEntity } from './entities/doubleFrameBuffer';
import { FrameBufferEntity } from './entities/frameBuffer';
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

  #renderingContext!: WebGL2RenderingContext;
  readonly #configuration: FluidConfiguration = Configuration();

  #compiledShaders!: CompiledShaders;
  #programs!: Programs;
  #displayMaterial!: MaterialEntity;
  #externalFormat!: ExternalFormat;

  #dye!: DoubleFrameBufferEntity;
  #velocity!: DoubleFrameBufferEntity;
  #divergence!: FrameBufferEntity;
  #curl!: FrameBufferEntity;
  #pressure!: DoubleFrameBufferEntity;
  #bloom!: FrameBufferEntity;
  #blooms!: FrameBufferEntity[];
  #sunrays!: FrameBufferEntity;
  #sunraysTemp!: FrameBufferEntity;

  #ditheringTexture!: DitheringTextureEntity;

  #lastUpdateTime = Date.now();

  public get canvas(): HTMLCanvasElement | OffscreenCanvas {
    return this.#renderingContext.canvas;
  }

  public bind(renderingContext: WebGL2RenderingContext) {
    if (this.#renderingContext) {
      throw Error('rendering context has already been set!');
    }

    this.#renderingContext = renderingContext;
    this.#externalFormat = getExternalFormat(renderingContext);

    this.#initialize();
  }

  public splatMovement(texMovement: TexMovement, color: Rgb): void {
    const { splatForce } = this.#configuration;

    const dx = texMovement.deltaX * splatForce;
    const dy = texMovement.deltaY * splatForce;
    this.splat(texMovement.x, texMovement.y, dx, dy, color);
  }

  public splat(x: number, y: number, dx: number, dy: number, color: Rgb): void {
    if (!this.#renderingContext) {
      throw Error('rendering context has not been set! Use bind() to provide a rendering context.');
    }

    const { splatProgram } = this.#programs;
    const { canvas } = this;

    splatProgram.bind();
    this.#renderingContext.uniform1i(splatProgram.uniforms['uTarget'], this.#velocity.read.attach(0));
    this.#renderingContext.uniform1f(splatProgram.uniforms['aspectRatio'], canvas.width / canvas.height);
    this.#renderingContext.uniform2f(splatProgram.uniforms['point'], x, y);
    this.#renderingContext.uniform3f(splatProgram.uniforms['color'], dx, dy, 0);
    this.#renderingContext.uniform1f(splatProgram.uniforms['radius'], this.#correctRadius(this.#configuration.splatRadius * .01));
    this.#blitFramebuffer(this.#velocity.write);
    this.#velocity.swap();

    this.#renderingContext.uniform1i(splatProgram.uniforms['uTarget'], this.#dye.read.attach(0));
    this.#renderingContext.uniform3f(splatProgram.uniforms['color'], color.r, color.g, color.b);
    this.#blitFramebuffer(this.#dye.write);
    this.#dye.swap();
  }

  #initialize(): void {
    this.#compiledShaders = compileShaders(this.#renderingContext);
    this.#programs = createPrograms(this.#renderingContext, this.#compiledShaders);
    this.#displayMaterial = createMaterial(this.#renderingContext, this.#compiledShaders.baseVertexShader);

    this.#initializeBlit();
    this.#initializeTexture();
    this.#updatekeywords();
    this.#initFramebuffers();

    requestAnimationFrame(this.#update.bind(this));
  }

  #updatekeywords(): void {
    const { shading, bloom, sunrays } = this.#configuration;

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

    this.#displayMaterial.setKeywords(displayKeywords);
  }

  #initFramebuffers(): void {
    // this might be called on resize (?)
    const { BLEND, HALF_FLOAT, LINEAR, NEAREST } = this.#renderingContext;
    const { formatRGBA, formatRG, formatR } = this.#externalFormat;
    const { simResolution, dyeResolution, bloomResolution, sunraysResolution, bloomIterations } = this.#configuration;
    const simRes = getResolution(this.#renderingContext, simResolution);
    const dyeRes = getResolution(this.#renderingContext, dyeResolution);
    const bloomRes = getResolution(this.#renderingContext, bloomResolution);
    const sunRaysRes = getResolution(this.#renderingContext, sunraysResolution);

    this.#renderingContext.disable(BLEND);

    this.#dye = this.#dye
      ? this.#resizeDoubleFBO(this.#dye, dyeRes, formatRGBA.internalFormat, formatRGBA.format, HALF_FLOAT, LINEAR)
      : new DoubleFrameBufferEntity(this.#renderingContext, dyeRes, formatRGBA.internalFormat, formatRGBA.format, HALF_FLOAT, LINEAR);

    this.#velocity = this.#velocity
      ? this.#resizeDoubleFBO(this.#velocity, simRes, formatRG.internalFormat, formatRG.format, HALF_FLOAT, LINEAR)
      : new DoubleFrameBufferEntity(this.#renderingContext, simRes, formatRG.internalFormat, formatRG.format, HALF_FLOAT, LINEAR);

    this.#divergence = new FrameBufferEntity(this.#renderingContext, simRes, formatR.internalFormat, formatR.format, HALF_FLOAT, NEAREST);
    this.#curl = new FrameBufferEntity(this.#renderingContext, simRes, formatR.internalFormat, formatR.format, HALF_FLOAT, NEAREST);
    this.#pressure = new DoubleFrameBufferEntity(this.#renderingContext, simRes, formatR.internalFormat, formatR.format, HALF_FLOAT, NEAREST);

    this.#bloom = new FrameBufferEntity(this.#renderingContext, bloomRes, formatRGBA.internalFormat, formatRGBA.format, HALF_FLOAT, LINEAR);
    this.#blooms = [];
    for (let i = 0; i < bloomIterations; i++) {
      let { width, height } = bloomRes;
      // eslint-disable-next-line no-bitwise
      width = width >> (i + 1);
      // eslint-disable-next-line no-bitwise
      height = height >> (i + 1);

      if (width < 2 || height < 2) {
        break;
      }

      const bloom = new FrameBufferEntity(this.#renderingContext, { width, height }, formatRGBA.internalFormat, formatRGBA.format, HALF_FLOAT, LINEAR);
      this.#blooms.push(bloom);

      this.#sunrays = new FrameBufferEntity(this.#renderingContext, sunRaysRes, formatR.internalFormat, formatR.format, HALF_FLOAT, LINEAR);
      this.#sunraysTemp = new FrameBufferEntity(this.#renderingContext, sunRaysRes, formatR.internalFormat, formatR.format, HALF_FLOAT, LINEAR);
    }
  }

  #update(): void {
    const delta = this.#calcDeltaTime();

    if (resizeCanvas(this.canvas)) {
      this.#initFramebuffers();
    }

    this.#step(delta);
    this.#render(null);
    requestAnimationFrame(this.#update.bind(this));
  }

  #step(deltaTime: number): void {
    const { BLEND } = this.#renderingContext;
    const { curlProgram, vorticityProgram, divergenceProgram, clearProgram, pressureProgram, gradienSubtractProgram, advectionProgram } = this.#programs;

    this.#renderingContext.disable(BLEND);

    curlProgram.bind();
    this.#renderingContext.uniform2f(curlProgram.uniforms['texelSize'], this.#velocity.texelSizeX, this.#velocity.texelSizeY);
    this.#renderingContext.uniform1i(curlProgram.uniforms['uVelocity'], this.#velocity.read.attach(0));
    this.#blitFramebuffer(this.#curl);

    vorticityProgram.bind();
    this.#renderingContext.uniform2f(vorticityProgram.uniforms['texelSize'], this.#velocity.texelSizeX, this.#velocity.texelSizeY);
    this.#renderingContext.uniform1i(vorticityProgram.uniforms['uVelocity'], this.#velocity.read.attach(0));
    this.#renderingContext.uniform1i(vorticityProgram.uniforms['uCurl'], this.#curl.attach(1));
    this.#renderingContext.uniform1f(vorticityProgram.uniforms['curl'], this.#configuration.curl);
    this.#renderingContext.uniform1f(vorticityProgram.uniforms['dt'], deltaTime);
    this.#blitFramebuffer(this.#velocity.write);
    this.#velocity.swap();

    divergenceProgram.bind();
    this.#renderingContext.uniform2f(divergenceProgram.uniforms['texelSize'], this.#velocity.texelSizeX, this.#velocity.texelSizeY);
    this.#renderingContext.uniform1i(divergenceProgram.uniforms['uVelocity'], this.#velocity.read.attach(0));
    this.#blitFramebuffer(this.#divergence);

    // disabled for watery appearance
    clearProgram.bind();
    this.#renderingContext.uniform1i(clearProgram.uniforms['uTexture'], this.#pressure.read.attach(0));
    this.#renderingContext.uniform1f(clearProgram.uniforms['value'], this.#configuration.pressure);
    this.#blitFramebuffer(this.#pressure.write);
    this.#pressure.swap();

    pressureProgram.bind();
    this.#renderingContext.uniform2f(pressureProgram.uniforms['texelSize'], this.#velocity.texelSizeX, this.#velocity.texelSizeY);
    this.#renderingContext.uniform1i(pressureProgram.uniforms['uDivergence'], this.#divergence.attach(0));
    for (let i = 0; i < this.#configuration.pressureIterations; i++) {
      this.#renderingContext.uniform1i(pressureProgram.uniforms['uPressure'], this.#pressure.read.attach(1));
      this.#blitFramebuffer(this.#pressure.write);
      this.#pressure.swap();
    }

    gradienSubtractProgram.bind();
    this.#renderingContext.uniform2f(gradienSubtractProgram.uniforms['texelSize'], this.#velocity.texelSizeX, this.#velocity.texelSizeY);
    this.#renderingContext.uniform1i(gradienSubtractProgram.uniforms['uPressure'], this.#pressure.read.attach(0));
    this.#renderingContext.uniform1i(gradienSubtractProgram.uniforms['uVelocity'], this.#velocity.read.attach(1));
    this.#blitFramebuffer(this.#velocity.write);
    this.#velocity.swap();

    advectionProgram.bind();
    this.#renderingContext.uniform2f(advectionProgram.uniforms['texelSize'], this.#velocity.texelSizeX, this.#velocity.texelSizeY);
    const velocityId = this.#velocity.read.attach(0);
    this.#renderingContext.uniform1i(advectionProgram.uniforms['uVelocity'], velocityId);
    this.#renderingContext.uniform1i(advectionProgram.uniforms['uSource'], velocityId);
    this.#renderingContext.uniform1f(advectionProgram.uniforms['dt'], deltaTime);
    this.#renderingContext.uniform1f(advectionProgram.uniforms['dissipation'], this.#configuration.velocityDissipation);
    this.#blitFramebuffer(this.#velocity.write);
    this.#velocity.swap();

    this.#renderingContext.uniform1i(advectionProgram.uniforms['uVelocity'], this.#velocity.read.attach(0));
    this.#renderingContext.uniform1i(advectionProgram.uniforms['uSource'], this.#dye.read.attach(1));
    this.#renderingContext.uniform1f(advectionProgram.uniforms['dissipation'], this.#configuration.densityDissipation);
    this.#blitFramebuffer(this.#dye.write);
    this.#dye.swap();
  }

  #render(target: FrameBufferEntity | null = null): void {
    const { ONE, ONE_MINUS_SRC_ALPHA, BLEND } = this.#renderingContext;

    if (this.#configuration.bloom) {
      this.#applyBloom(this.#dye.read, this.#bloom);
    }

    if (this.#configuration.sunrays) {
      this.#applySunrays(this.#dye.read, this.#dye.write, this.#sunrays);
      this.#blur(this.#sunrays, this.#sunraysTemp, 1);
    }

    if (!target || !this.#configuration.transparent) {
      this.#renderingContext.blendFunc(ONE, ONE_MINUS_SRC_ALPHA);
      this.#renderingContext.enable(BLEND);
    } else {
      this.#renderingContext.disable(BLEND);
    }

    if (!this.#configuration.transparent) {
      this.#drawColor(target, normalizeColor(this.#configuration.backColor));
    }

    this.#drawDisplay(target);
  }

  #applyBloom(source: FrameBufferEntity, destination: FrameBufferEntity): void {
    if (this.#blooms.length < 2) {
      return;
    }

    const { BLEND, ONE } = this.#renderingContext;
    const { bloomThreshold, bloomSoftKnee, bloomIntensity } = this.#configuration;
    const { bloomPrefilterProgram, bloomBlurProgram, bloomFinalProgram } = this.#programs;

    let last = destination;

    this.#renderingContext.disable(BLEND);
    bloomPrefilterProgram.bind();

    const knee = bloomThreshold * bloomSoftKnee + 0.0001;
    const curve0 = bloomThreshold - knee;
    const curve1 = knee * 2;
    const curve2 = .25 / knee;

    this.#renderingContext.uniform3f(bloomPrefilterProgram.uniforms['curve'], curve0, curve1, curve2);
    this.#renderingContext.uniform1f(bloomPrefilterProgram.uniforms['threshold'], bloomThreshold);
    this.#renderingContext.uniform1i(bloomPrefilterProgram.uniforms['uTexture'], source.attach(0));
    this.#blitFramebuffer(last);

    bloomBlurProgram.bind();

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < this.#blooms.length; i++) {
      const dest = this.#blooms[i];
      this.#renderingContext.uniform2f(bloomBlurProgram.uniforms['texelSize'], last.texelSizeX, last.texelSizeY);
      this.#renderingContext.uniform1i(bloomBlurProgram.uniforms['uTexture'], last.attach(0));
      this.#blitFramebuffer(dest);
      last = dest;
    }

    this.#renderingContext.blendFunc(ONE, ONE);
    this.#renderingContext.enable(BLEND);

    for (let i = this.#blooms.length - 2; i >= 0; i--) {
      const baseTex = this.#blooms[i];
      this.#renderingContext.uniform2f(bloomBlurProgram.uniforms['texelSize'], last.texelSizeX, last.texelSizeY);
      this.#renderingContext.uniform1i(bloomBlurProgram.uniforms['uTexture'], last.attach(0));
      this.#renderingContext.viewport(0, 0, baseTex.width, baseTex.height);
      this.#blitFramebuffer(baseTex);
      last = baseTex;
    }

    this.#renderingContext.disable(BLEND);
    bloomFinalProgram.bind();

    this.#renderingContext.uniform2f(bloomFinalProgram.uniforms['texelSize'], last.texelSizeX, last.texelSizeY);
    this.#renderingContext.uniform1i(bloomFinalProgram.uniforms['uTexture'], last.attach(0));
    this.#renderingContext.uniform1f(bloomFinalProgram.uniforms['intensity'], bloomIntensity);
    this.#blitFramebuffer(destination);
  }

  #applySunrays(source: FrameBufferEntity, mask: FrameBufferEntity, destination: FrameBufferEntity): void {
    const { BLEND } = this.#renderingContext;
    const { sunraysWeight } = this.#configuration;
    const { sunraysMaskProgram, sunraysProgram } = this.#programs;

    this.#renderingContext.disable(BLEND);
    sunraysMaskProgram.bind();
    this.#renderingContext.uniform1i(sunraysMaskProgram.uniforms['uTexture'], source.attach(0));
    this.#blitFramebuffer(mask);

    sunraysProgram.bind();
    this.#renderingContext.uniform1f(sunraysProgram.uniforms['weight'], sunraysWeight);
    this.#renderingContext.uniform1i(sunraysProgram.uniforms['uTexture'], mask.attach(0));
    this.#blitFramebuffer(destination);
  }

  #blur(target: FrameBufferEntity, temp: FrameBufferEntity, iterations: number): void {
    const { blurProgram } = this.#programs;

    blurProgram.bind();
    for (let i = 0; i < iterations; i++) {
      this.#renderingContext.uniform2f(blurProgram.uniforms['texelSize'], target.texelSizeX, 0);
      this.#renderingContext.uniform1i(blurProgram.uniforms['uTexture'], target.attach(0));
      this.#blitFramebuffer(temp);

      this.#renderingContext.uniform2f(blurProgram.uniforms['texelSize'], 0, target.texelSizeY);
      this.#renderingContext.uniform1i(blurProgram.uniforms['uTexture'], temp.attach(0));
      this.#blitFramebuffer(target);
    }
  }

  #drawColor(target: FrameBufferEntity | null, color: Rgb): void {
    const { colorProgram } = this.#programs;

    colorProgram.bind();
    this.#renderingContext.uniform4f(colorProgram.uniforms['color'], color.r, color.g, color.b, 1);

    this.#blitFramebuffer(target);
  }

  #drawDisplay(target: FrameBufferEntity | null) {
    const { drawingBufferWidth, drawingBufferHeight } = this.#renderingContext;
    const { shading, bloom, sunrays } = this.#configuration;

    const width = target ? target.width : drawingBufferWidth;
    const height = target ? target.height : drawingBufferHeight;

    this.#displayMaterial.bind();
    if (shading) {
      this.#renderingContext.uniform2f(this.#displayMaterial.uniforms['texelSize'], 1 / width, 1 / height);
    }

    this.#renderingContext.uniform1i(this.#displayMaterial.uniforms['uTexture'], this.#dye.read.attach(0));

    if (bloom) {
      this.#renderingContext.uniform1i(this.#displayMaterial.uniforms['uBloom'], this.#bloom.attach(1));
      this.#renderingContext.uniform1i(this.#displayMaterial.uniforms['uDithering'], this.#ditheringTexture.attach(2));
      const scale = getTextureScale(this.#ditheringTexture, width, height);
      this.#renderingContext.uniform2f(this.#displayMaterial.uniforms['ditherScale'], scale.width, scale.height);
    }

    if (sunrays) {
      this.#renderingContext.uniform1i(this.#displayMaterial.uniforms['uSunrays'], this.#sunrays.attach(3));
    }

    this.#blitFramebuffer(target);
  }

  #resizeFBO(target: FrameBufferEntity, dimensions: Dimension, internalFormat: number, format: number, type: number, param: number): FrameBufferEntity {
    const { copyProgram } = this.#programs as Programs;
    const newFBO = new FrameBufferEntity(this.#renderingContext, dimensions, internalFormat, format, type, param);

    copyProgram.bind();
    this.#renderingContext.uniform1i(copyProgram.uniforms['uTexture'], target.attach(0));
    this.#blitFramebuffer(newFBO);

    return newFBO;
  }

  #resizeDoubleFBO(target: DoubleFrameBufferEntity, dimensions: Dimension, internalFormat: number, format: number, type: number, param: number): DoubleFrameBufferEntity {
    const { width, height } = dimensions;
    if (target.width === width && target.height === height) {
      return target;
    }

    target.read = this.#resizeFBO(target.read, dimensions, internalFormat, format, type, param);
    target.write = new FrameBufferEntity(this.#renderingContext, dimensions, internalFormat, format, type, param);
    return target;
  }

  #blitFramebuffer(target: FrameBufferEntity | null): void {
    const { FRAMEBUFFER, TRIANGLES, UNSIGNED_SHORT } = this.#renderingContext;

    if (!target) {
      this.#renderingContext.viewport(0, 0, this.#renderingContext.drawingBufferWidth, this.#renderingContext.drawingBufferHeight);
      this.#renderingContext.bindFramebuffer(FRAMEBUFFER, null);
    } else {
      this.#renderingContext.viewport(0, 0, target.width, target.height);
      this.#renderingContext.bindFramebuffer(FRAMEBUFFER, target.frameBufferObject);
    }

    this.#renderingContext.drawElements(TRIANGLES, 6, UNSIGNED_SHORT, 0);
  };

  #initializeBlit(): void {
    const { ARRAY_BUFFER, ELEMENT_ARRAY_BUFFER, STATIC_DRAW, FLOAT } = this.#renderingContext;
    this.#renderingContext.bindBuffer(ARRAY_BUFFER, this.#renderingContext.createBuffer());
    this.#renderingContext.bufferData(ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), STATIC_DRAW);
    this.#renderingContext.bindBuffer(ELEMENT_ARRAY_BUFFER, this.#renderingContext.createBuffer());
    this.#renderingContext.bufferData(ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), STATIC_DRAW);
    this.#renderingContext.vertexAttribPointer(0, 2, FLOAT, false, 0, 0);
    this.#renderingContext.enableVertexAttribArray(0);
  }

  #initializeTexture(): void {
    this.#ditheringTexture = new DitheringTextureEntity(this.#renderingContext);
  }

  #correctRadius(radius: number): number {
    const { canvas } = this;
    const aspectRatio = canvas.width / canvas.height;

    if (aspectRatio > 1) {
      radius *= aspectRatio;
    }

    return radius;
  }

  #calcDeltaTime() {
    const now = Date.now();

    let delta = (now - this.#lastUpdateTime) * .001;
    delta = Math.min(delta, 1/60);
    this.#lastUpdateTime = now;

    return delta;
  }

}
