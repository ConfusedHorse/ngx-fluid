import { inject, NgZone } from '@angular/core';
import { EMPTY, Observable, Observer } from 'rxjs';

/**
 * Creates a ResizeObserver that provides its results as observable
 * Note: This returns an empty observable on browsers that do not support ResizeObserver (e.g.) Safari iOS.
 *
 * @param target node that should be observed
 */
export default (target: Element, options?: ResizeObserverOptions): Observable<ResizeObserverEntry[]> => {
  if (ResizeObserver === undefined) {
    return EMPTY;
  }

  return new Observable((observer: Observer<ResizeObserverEntry[]>) => {
    const resizeObserver = new ResizeObserver((entries) => observer.next(entries));
    inject(NgZone).runOutsideAngular(() => resizeObserver.observe(target, options));
    return () => resizeObserver.disconnect();
  });
};
