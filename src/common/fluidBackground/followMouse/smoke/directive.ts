import { Directive } from '@angular/core';
import { rgb } from '../../../fluid/helpers/color';
import { Rgb } from '../../../fluid/model/color';
import { INJECT_FLUID_CONFIGURATION } from '../../../fluid/model/configuration';
import { FluidService } from '../../../fluid/service';
import { FluidBackgroundMouseMoveDirective } from '../directive.base';
import { SMOKE_CONFIGURATION } from './configuration';

@Directive({
  standalone: true,
  providers: [
    FluidService,
    {
      provide: INJECT_FLUID_CONFIGURATION,
      useValue: SMOKE_CONFIGURATION
    }
  ]
})
export class SmokeBackgroundMouseMoveDirective extends FluidBackgroundMouseMoveDirective {

  protected override _color: Rgb = rgb(25, 25, 51);

}
