import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Swiper wird jetzt zentral über SwiperLoaderService geladen, um Race Conditions zu vermeiden
// Preload entfernt, da mehrere Komponenten gleichzeitig Swiper laden können

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => {
    console.error('Bootstrap failed:', err);
    document.body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:20px;background:#fff;">
        <p style="font-size:16px;color:#333;margin-bottom:16px;">Die App konnte nicht geladen werden.</p>
        <button onclick="location.reload()" style="padding:12px 24px;font-size:15px;background:#1976d2;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:500;">Erneut versuchen</button>
      </div>
    `;
  });
