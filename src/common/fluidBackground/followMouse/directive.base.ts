import { Directive, OnInit } from '@angular/core';
import { asyncScheduler, fromEvent, tap, throttleTime } from 'rxjs';
import { rgb } from '../../fluid/helpers/color';
import toTexMovement from '../../fluid/helpers/pipes/toTexMovement';
import { Rgb } from '../../fluid/model/color';
import untilDestroyed from '../../untilDestroyed/untilDestroyed';
import { FluidBackgroundDirective } from '../directive.base';

@Directive({
  standalone: true
})
export abstract class FluidBackgroundMouseMoveDirective extends FluidBackgroundDirective implements OnInit {

  private readonly _untilDestroyed = untilDestroyed();

  protected _color: Rgb = rgb(25, 25, 127);

  ngOnInit(): void {
    const canvas = this._fluidService.canvas;

    const mouseEvents$ = fromEvent<MouseEvent>(this._elementRef.nativeElement, 'mousemove').pipe(
      throttleTime(15, asyncScheduler, { leading: true, trailing: true })
    );

    mouseEvents$.pipe(
      toTexMovement(canvas),
      tap(texMovement => this._fluidService.splatMovement(texMovement, this._color)),
      this._untilDestroyed
    ).subscribe();
  }

}
