import { Directive, inject } from '@angular/core';
import { CanvasBackgroundDirective } from '../canvasBackground/directive';
import { FluidService } from '../fluid/service';

@Directive({
  standalone: true,
  providers: [FluidService]
})
export class FluidBackgroundDirective extends CanvasBackgroundDirective {

  private readonly _fluidService = inject(FluidService);

  constructor() {
    super();
    this._fluidService.bind(this._renderingContext);
  }

}
