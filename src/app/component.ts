import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SmokeBackgroundMouseMoveDirective } from '../common/fluidBackground/followMouse/smoke/directive';

@Component({
  standalone: true,
  imports: [ CommonModule ],
  // hostDirectives: [ FluidBackgroundCircleDirective ],
  hostDirectives: [ SmokeBackgroundMouseMoveDirective ],
  // hostDirectives: [ FluidBackgroundMouseMoveDirective ],
  selector: 'app-root',
  templateUrl: './component.html',
  styleUrls: ['./component.scss']
})
export class AppComponent {

  constructor() {
    window.addEventListener('contextmenu', e => e.preventDefault());
  }

}
