import { ChangeDetectorRef, inject, isDevMode, ViewRef } from '@angular/core';
import { MonoTypeOperatorFunction, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export default (): MonoTypeOperatorFunction<unknown> => {
  if (isDevMode()) {
    return _ => _;
  }

  const subject = new Subject<void>();

  const viewRef = inject(ChangeDetectorRef) as ViewRef;

  viewRef.onDestroy(() => {
    subject.next();
    subject.complete();
  });

  return takeUntil(subject.asObservable());
};
