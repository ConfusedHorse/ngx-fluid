import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FluidBackgroundDirective } from '../common/fluidBackground/directive';

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
export class AppComponent {

  constructor() {
    window.addEventListener('contextmenu', e => e.preventDefault());
  }

}
