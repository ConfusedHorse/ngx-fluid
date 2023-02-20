import { FluidConfiguration } from '../../fluid/model/configuration';

export const CIRCLE_CONFIGURATION: FluidConfiguration = {
  simResolution: 256,
  dyeResolution: 1024,
  densityDissipation: .75,
  velocityDissipation: 0,
  pressure: 0,
  pressureIterations: 5,
  curl: 0,
  splatRadius: .01,
  splatForce: 6000,
  shading: true,
  backColor: { r: 0, g: 0, b: 0 },
  transparent: false,
  bloom: true,
  bloomIterations: 8,
  bloomResolution: 256,
  bloomIntensity: .1,
  bloomThreshold: 0,
  bloomSoftKnee: .7,
  sunrays: false,
  sunraysResolution: 196,
  sunraysWeight: 1
};
