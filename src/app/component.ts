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

  protected readonly _loremIpsum = `
  Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.
  At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.
  Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.
  At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.
  Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua.
  At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.
  Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros
  et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi. Lorem ipsum dolor sit amet,
  consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.
  Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. Duis autem vel eum iriure
  dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim
  qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.
  Nam liber tempor cum soluta nobis eleifend option congue nihil imperdiet doming id quod mazim placerat facer possim assum. Lorem ipsum dolor sit amet,
  consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam,
  quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat.
  Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis.`;

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
