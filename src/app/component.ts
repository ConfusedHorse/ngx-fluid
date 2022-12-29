import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { tap } from 'rxjs';
import mouseMove$ from '../common/mouse/mouseMove$';

@Component({
  standalone: true,
  imports: [
    CommonModule
  ],
  selector: 'app-root',
  templateUrl: './component.html',
  styleUrls: ['./component.scss']
})
export class AppComponent {

  constructor() {
    window.addEventListener('contextmenu', e => e.preventDefault());

    mouseMove$().pipe(
      tap(console.log)
    ).subscribe();
  }

}
