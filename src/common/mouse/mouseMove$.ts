import { inject } from '@angular/core';
import { MouseService } from './service';

export default () => inject(MouseService).move$;
