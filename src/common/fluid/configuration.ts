import { FluidConfiguration } from './model';

export default {
  simResolution: 256,
  dyeResolution: 1024,
  densityDissipation: 1,
  velocityDissipation: 0,
  pressure: 0,
  pressureIterations: 20,
  curl: 0,
  splatRadius: .1,
  splatForce: 6000,
  shading: true,
  backColor: { r: 0, g: 0, b: 0 },
  transparent: true,
  bloom: true,
  bloomIterations: 8,
  bloomResolution: 256,
  bloomIntensity: .1,
  bloomThreshold: 0,
  bloomSoftKnee: .7,
  sunrays: true,
  sunraysResolution: 196,
  sunraysWeight: 1
} as FluidConfiguration;
