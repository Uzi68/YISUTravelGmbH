import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Swiper wird jetzt zentral über SwiperLoaderService geladen, um Race Conditions zu vermeiden
// Preload entfernt, da mehrere Komponenten gleichzeitig Swiper laden können

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
