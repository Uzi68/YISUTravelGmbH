import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Preload Swiper for better performance on slow connections
if (typeof window !== 'undefined') {
  // Start preloading Swiper immediately
  import('swiper/element/bundle').catch(() => {
    // Silent fail - will be handled by individual components
  });
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
