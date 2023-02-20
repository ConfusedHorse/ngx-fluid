import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FluidBackgroundCircleDirective } from '../common/fluidBackground/circle/directive.base';

@Component({
  standalone: true,
  imports: [ CommonModule ],
  hostDirectives: [ FluidBackgroundCircleDirective ],
  // hostDirectives: [ SmokeBackgroundMouseMoveDirective ],
  selector: 'app-root',
  templateUrl: './component.html',
  styleUrls: ['./component.scss']
})
export class AppComponent {

  constructor() {
    window.addEventListener('contextmenu', e => e.preventDefault());
  }

}
