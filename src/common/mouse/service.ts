import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { asyncScheduler, fromEvent, Observable } from 'rxjs';
import { shareReplay, throttleTime } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MouseService {

  private _document = inject(DOCUMENT);
  public readonly move$: Observable<MouseEvent>;

  constructor() {
    this.move$ = fromEvent<MouseEvent>(this._document, 'mousemove').pipe(
      throttleTime(10, asyncScheduler, { leading: true, trailing: true }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

}