import { Directive, inject } from '@angular/core';
import { CanvasBackgroundDirective } from '../canvasBackground/directive';
import { FluidService } from '../fluid/service';

@Directive({
  standalone: true
})
export abstract class FluidBackgroundDirective extends CanvasBackgroundDirective {

  protected readonly _fluidService = inject(FluidService);

  constructor() {
    super();
    this._fluidService.bind(this._renderingContext);
  }

}
