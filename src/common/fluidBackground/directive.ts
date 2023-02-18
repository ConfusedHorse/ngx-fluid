import { Directive, inject, OnInit } from '@angular/core';
import { filter, fromEvent, map, merge, mergeMap, pairwise, takeUntil, tap } from 'rxjs';
import { CanvasBackgroundDirective } from '../canvasBackground/directive';
import { correctDeltaX, correctDeltaY, scaleByPixelRatio } from '../fluid/helpers/dimension';
import { TexCoordinates, TexMovement } from '../fluid/model/dimension';
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

    const dragMove$ = fromEvent<MouseEvent>(canvas, 'mousedown').pipe(
      mergeMap(_ => fromEvent<MouseEvent>(canvas, 'mousemove').pipe(
        takeUntil(merge(
          fromEvent<MouseEvent>(canvas, 'mouseup'),
          fromEvent<MouseEvent>(canvas, 'mouseleave'),
        )))
      )
    );

    dragMove$.pipe(
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
      tap<any>(texMovement => this._fluidService.splatMovement(texMovement, { r: .1, g: .1, b: .5 })),
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
