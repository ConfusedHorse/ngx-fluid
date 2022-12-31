import { Directive, HostListener, inject } from '@angular/core';
import { interval, tap } from 'rxjs';
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

    interval(1000).pipe(
      tap(this._randomSplat.bind(this))
    ).subscribe();
  }

  @HostListener('click') test() {
    // this._fluidService.multipleSplats(Math.random() * 20 + 5);
  }

  private _randomSplat(): void {
    const force = 1500;
    const dx = Math.random() * 2 * force - force;
    const dy = Math.random() * 2 * force - force;
    this._fluidService.splat(.5, .5, dx, dy, { r: 0, g: 1, b: 1.5 });
  }

}
