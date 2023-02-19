import { FluidConfiguration } from '../../../fluid/model/configuration';

export const SMOKE_CONFIGURATION: Partial<FluidConfiguration> = {
  velocityDissipation: .75,
  pressure: 0,
  curl: 0,
  splatRadius: .1,
  splatForce: 6000,
  bloom: false,
  sunrays: false
};
