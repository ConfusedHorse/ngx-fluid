import { DestroyRef, Directive, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { asyncScheduler, fromEvent, tap, throttleTime } from 'rxjs';
import { rgb } from '../../fluid/helpers/color';
import toTexMovement from '../../fluid/helpers/pipes/toTexMovement';
import { Rgb } from '../../fluid/model/color';
import { FluidService } from '../../fluid/service';
import { FluidBackgroundDirective } from '../directive.base';

@Directive({
  standalone: true,
  providers: [
    FluidService
  ]
})
export class FluidBackgroundMouseMoveDirective extends FluidBackgroundDirective implements OnInit {

  #destroyRef = inject(DestroyRef);
  protected _color: Rgb = rgb(25, 25, 127);

  ngOnInit(): void {
    const canvas = this._fluidService.canvas;

    const mouseEvents$ = fromEvent<MouseEvent>(this._elementRef.nativeElement, 'mousemove').pipe(
      throttleTime(15, asyncScheduler, { leading: true, trailing: true })
    );

    mouseEvents$.pipe(
      toTexMovement(canvas),
      tap(texMovement => this._fluidService.splatMovement(texMovement, this._color)),
      takeUntilDestroyed(this.#destroyRef)
    ).subscribe();
  }

}
