import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { asyncScheduler, fromEvent, tap, throttleTime } from 'rxjs';
import { rgb } from '../common/fluid/helpers/color';
import mouseMovementToTexMovement from '../common/fluid/helpers/pipes/mouseMovementToTexMovement';
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

  constructor() {
    window.addEventListener('contextmenu', e => e.preventDefault());
  }

  ngOnInit(): void {
    const canvas = this._fluidService.canvas;

    fromEvent<MouseEvent>(window, 'mousemove').pipe(
      throttleTime(15, asyncScheduler, { leading: true, trailing: true }),
      mouseMovementToTexMovement(canvas),
      tap(texMovement => this._fluidService.splatMovement(texMovement, rgb(.1, .1, .5))),
      this._untilDestroyed
    ).subscribe();
  }

}
