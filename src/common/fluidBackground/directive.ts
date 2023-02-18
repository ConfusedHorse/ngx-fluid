import { Directive, inject, OnInit } from '@angular/core';
import { asyncScheduler, fromEvent, tap, throttleTime } from 'rxjs';
import { CanvasBackgroundDirective } from '../canvasBackground/directive';
import { rgb } from '../fluid/helpers/color';
import mouseMovementToTexMovement from '../fluid/helpers/pipes/mouseMovementToTexMovement';
import { FluidService } from '../fluid/service';
import untilDestroyed from '../untilDestroyed/untilDestroyed';

@Directive({
  standalone: true,
  providers: [FluidService]
})
export class FluidBackgroundDirective extends CanvasBackgroundDirective implements OnInit {

  private readonly _fluidService = inject(FluidService);
  private readonly _untilDestroyed = untilDestroyed();

  constructor() {
    super();

    this._fluidService.bind(this._renderingContext);

    // interval(100).pipe(
    //   tap(this._randomSplat.bind(this))
    // ).subscribe();
  }

  ngOnInit(): void {
    const canvas = this._renderingContext.canvas;

    fromEvent<MouseEvent>(window, 'mousemove').pipe(
      throttleTime(15, asyncScheduler, { leading: true, trailing: true }),
      mouseMovementToTexMovement(canvas),
      tap(texMovement => this._fluidService.splatMovement(texMovement, rgb(.1, .1, .5))),
      this._untilDestroyed
    ).subscribe();
  }

  // private _randomSplat(): void {
  //   const force = 1500;
  //   const dx = Math.random() * 2 * force - force;
  //   const dy = Math.random() * 2 * force - force;

  //   const color = getRandomColor(1);
  //   color.r *= 10;
  //   color.g *= 10;
  //   color.b *= 10;
  //   this._fluidService.splat(.5, .5, dx, dy, color);
  // }

}
