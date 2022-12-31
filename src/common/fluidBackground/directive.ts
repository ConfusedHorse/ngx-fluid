import { Directive, HostListener, inject } from '@angular/core';
import { CanvasBackgroundDirective } from '../canvasBackground/directive';
import { FluidService } from '../fluid/service';

@Directive({
  standalone: true,
  providers: [FluidService]
})
export class FluidBackgroundDirective extends CanvasBackgroundDirective {

  private _fluidService = inject(FluidService);

  constructor() {
    super();

    this._fluidService.bind(this._renderingContext);
  }

  @HostListener('click') test() {
    this._fluidService.multipleSplats(10);
  }

}
