import { Directive, HostListener, inject, OnInit } from '@angular/core';
import { asyncScheduler, filter, fromEvent, map, pairwise, tap, throttleTime } from 'rxjs';
import { CanvasBackgroundDirective } from '../canvasBackground/directive';
import { correctDeltaX, correctDeltaY, TexCoordinates, TexMovement } from '../fluid/model';
import { FluidService } from '../fluid/service';
import { scaleByPixelRatio } from '../resize/model';
import untilDestroyed from '../untilDestroyed/untilDestroyed';

@Directive({
  standalone: true,
  providers: [FluidService]
})
export class FluidBackgroundDirective extends CanvasBackgroundDirective implements OnInit {

  private _fluidService = inject(FluidService);
  private _untilDestroyed = untilDestroyed();

  constructor() {
    super();

    this._fluidService.bind(this._renderingContext);

    // interval(1000).pipe(
    //   tap(this._randomSplat.bind(this))
    // ).subscribe();
  }

  ngOnInit(): void {
    const canvas = this._renderingContext.canvas;

    fromEvent<MouseEvent>(canvas, 'mousemove').pipe(
      throttleTime(25, asyncScheduler, { leading: true, trailing: true }),
      map(({ clientX, clientY }) => ({
        x: scaleByPixelRatio(clientX) / canvas.width,
        y: scaleByPixelRatio(clientY) / canvas.height
      })),
      pairwise(),
      map<[TexCoordinates, TexCoordinates], TexMovement>(([ previous, current ]) => ({
        x: current.x,
        y: 1 - current.y,
        deltaX: correctDeltaX(current.x - previous.x, canvas),
        deltaY: correctDeltaY(previous.y - current.y, canvas)
      })),
      filter(texMovement => Math.abs(texMovement.deltaX) > 0 || Math.abs(texMovement.deltaY) > 0),
      tap(texMovement => this._fluidService.splatMovement(texMovement, { r: 0, g: .25, b: 1 })),
      this._untilDestroyed
    ).subscribe();
  }

  @HostListener('click') test() {
    // this._fluidService.multipleSplats(Math.random() * 20 + 5);
  }

  private _randomSplat(): void {
    const force = 1500;
    const dx = Math.random() * 2 * force - force;
    const dy = Math.random() * 2 * force - force;
    this._fluidService.splat(.5, .5, dx, dy, { r: 0, g: 1, b: 1 });
  }

}
