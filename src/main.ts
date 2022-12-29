import { importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from './app/component';
import { MouseService } from './common/mouse/service';

bootstrapApplication(AppComponent, {
  providers: [
    MouseService,
    importProvidersFrom(BrowserAnimationsModule)
  ]
});
