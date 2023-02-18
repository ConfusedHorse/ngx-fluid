import { DitheringTextureEntity } from '../entities/texture';
import { Dimension } from '../model/dimension';

export function correctDeltaX(delta: number, dimensions: Dimension) {
  const { width, height } = dimensions;

  const aspectRatio = width / height;
  if (aspectRatio < 1) {
    delta *= aspectRatio;
  }

  return delta;
}

export function correctDeltaY(delta: number, dimensions: Dimension) {
  const { width, height } = dimensions;

  const aspectRatio = width / height;
  if (aspectRatio > 1) {
    delta /= aspectRatio;
  }

  return delta;
}

// export function getResolution(renderingContext: WebGL2RenderingContext, resolution: number): Dimension {
//   // TODO optimize this

//   const { drawingBufferWidth, drawingBufferHeight } = renderingContext;
//   let aspectRatio = drawingBufferWidth / drawingBufferHeight;
//   if (aspectRatio < 1) {
//     aspectRatio = 1 / aspectRatio;
//   }

//   const min = Math.round(resolution);
//   const max = Math.round(resolution * aspectRatio);

//   return drawingBufferWidth > drawingBufferHeight
//     ? { width: max, height: min }
//     : { width: min, height: max };
// }

// eslint-disable-next-line @typescript-eslint/naming-convention
export const getResolution = (() => {
  const cache = new Map<string, Dimension>();
  return (renderingContext: WebGL2RenderingContext, resolution: number): Dimension => {
    const { drawingBufferWidth, drawingBufferHeight } = renderingContext;
    const key = `${drawingBufferWidth},${drawingBufferHeight},${resolution}`;
    if (cache.has(key)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return cache.get(key)!;
    }

    const min = resolution;
    const aspectRatio = Math.max(drawingBufferWidth / drawingBufferHeight, 1 / (drawingBufferWidth / drawingBufferHeight));
    const max = min * aspectRatio;

    const result = drawingBufferWidth > drawingBufferHeight
      ? { width: Math.floor(max), height: Math.floor(min) }
      : { width: Math.floor(min), height: Math.floor(max) };

    cache.set(key, result);
    return result;
  };
})();

export function getTextureScale(ditheringTexture: DitheringTextureEntity, width: number, height: number): Dimension {
  return {
    width: width / ditheringTexture.width,
    height: height / ditheringTexture.height
  };
}

export function resizeCanvas(canvas: HTMLCanvasElement | OffscreenCanvas): boolean {
  const canvasHeight = canvas instanceof HTMLCanvasElement ? canvas.clientHeight : canvas.height;
  const canvasWidth = canvas instanceof HTMLCanvasElement ? canvas.clientWidth : canvas.width;

  const width = scaleByPixelRatio(canvasWidth);
  const height = scaleByPixelRatio(canvasHeight);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;

    return true;
  }

  return false;
}

export function scaleByPixelRatio(pixels: number): number {
  const ratio = window.devicePixelRatio || 1;
  return Math.floor(pixels * ratio);
}
