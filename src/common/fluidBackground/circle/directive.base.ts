import { Directive, OnInit } from '@angular/core';
import { interval, tap } from 'rxjs';
import { rgb } from '../../fluid/helpers/color';
import { Rgb } from '../../fluid/model/color';
import { INJECT_FLUID_CONFIGURATION } from '../../fluid/model/configuration';
import { TexCoordinates, TexMovement } from '../../fluid/model/dimension';
import { FluidService } from '../../fluid/service';
import { FluidBackgroundDirective } from '../directive.base';
import { CIRCLE_CONFIGURATION } from './configuration';

@Directive({
  standalone: true,
  providers: [
    FluidService,
    {
      provide: INJECT_FLUID_CONFIGURATION,
      useValue: CIRCLE_CONFIGURATION
    }
  ]
})
export /*abstract*/ class FluidBackgroundCircleDirective extends FluidBackgroundDirective implements OnInit {

  protected _color: Rgb = rgb(255, 0, 0);
  protected readonly _center: TexCoordinates = { x: .5, y: .5 };

  ngOnInit(): void {

    this.#test();

    // fromEvent<MouseEvent>(this._elementRef.nativeElement, 'click').pipe(
    //   startWith(true),
    //   tap(_ => this._splatCircle(16, .1)),
    //   tap(_ => {
    //     // console.log(dataArray);
    //   })
    // ).subscribe();
  }

  async #test() {
    const bands = 16;
    const audioContext = new AudioContext();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(stream);

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = bands * 2;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const levels = new Uint8Array(bufferLength);

    interval(17).pipe(
      tap(() => {
        analyser.getByteFrequencyData(levels);
        this.#splatLevelCircle(bands, .1, levels);
      })
    ).subscribe();
  }

  #splatLevelCircle(amount: number, radius: number, levels: Uint8Array): void {
    const average = levels.reduce((avg, v, __, a) => (avg + v / a.length), 0);
    const circlePoints = this.#getCirclePoints(amount, radius, average);

    circlePoints.forEach(({ x, y, deltaX, deltaY }, i) => {
      this._fluidService.splat(x, y, deltaX, deltaY, this.#getColor(levels[i]));
    });
  }

  // #splatCircle(amount: number, radius: number, delta: number): void {
  //   const circlePoints = this.#getCirclePoints(amount, radius, delta);

  //   circlePoints.forEach(({ x, y, deltaX, deltaY }) => {
  //     this._fluidService.splat(x, y, deltaX, deltaY, this._color);
  //   });
  // }

  #getColor(level: number): Rgb {
    // return rgb(level, 0, (255 - level));
    return level > 63 ? rgb(0, 0, 63) : rgb(0, 0, 0);
  }

  #getCirclePoints(amount: number, radius: number, delta: number = 250): ReadonlyArray<TexMovement> {
    const { clientWidth, clientHeight } = this._fluidService.canvas as HTMLCanvasElement;
    const deltaRadius = radius + delta;
    const angleStep = (2 * Math.PI) / amount;

    const points: TexMovement[] = [];

    const minDimension = Math.min(clientWidth, clientHeight);
    const verticalRatio = clientHeight / minDimension;
    const horizontalRatio = clientWidth / minDimension;

    for (let i = 0; i < amount; i++) {
      const angle = 90 - angleStep + i * angleStep;

      points.push({
        x: this._center.x + radius * Math.cos(angle) * verticalRatio,
        y: this._center.y + radius * Math.sin(angle) * horizontalRatio,
        deltaX: this._center.x + deltaRadius * Math.cos(angle) * verticalRatio,
        deltaY: this._center.y + deltaRadius * Math.sin(angle) * horizontalRatio
      });
    }

    return points;
  }

}
