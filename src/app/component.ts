import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, OnInit } from '@angular/core';
import { asyncScheduler, from, fromEvent, map, merge, switchMap, tap, throttleTime } from 'rxjs';
import { rgb } from '../common/fluid/helpers/color';
import toTexMovement from '../common/fluid/helpers/pipes/toTexMovement';
import { FluidService } from '../common/fluid/service';
import { FluidBackgroundDirective } from '../common/fluidBackground/directive';
import untilDestroyed from '../common/untilDestroyed/untilDestroyed';

@Component({
  standalone: true,
  imports: [
    CommonModule
  ],
  hostDirectives: [
    FluidBackgroundDirective
  ],
  selector: 'app-root',
  templateUrl: './component.html',
  styleUrls: ['./component.scss']
})
export class AppComponent implements OnInit {

  private readonly _fluidService = inject(FluidService);
  private readonly _untilDestroyed = untilDestroyed();

  constructor(private _elementRef: ElementRef) {
    window.addEventListener('contextmenu', e => e.preventDefault());
  }

  ngOnInit(): void {
    const canvas = this._fluidService.canvas;

    const mouseEvents$ = fromEvent<MouseEvent>(this._elementRef.nativeElement, 'mousemove').pipe(
      throttleTime(15, asyncScheduler, { leading: true, trailing: true })
    );

    const touchEvents$ = fromEvent<TouchEvent>(this._elementRef.nativeElement, 'touchmove').pipe(
      switchMap(({ touches }) => from(touches)),
      map(touch => touch as any), // FIXME meh
    );

    merge(mouseEvents$, touchEvents$).pipe(
      toTexMovement(canvas),
      tap(texMovement => this._fluidService.splatMovement(texMovement, rgb(.1, .1, .5))),
      this._untilDestroyed
    ).subscribe();
  }

}
