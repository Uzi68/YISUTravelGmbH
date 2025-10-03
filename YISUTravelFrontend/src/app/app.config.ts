import { ApplicationConfig, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {provideHttpClient, withFetch, withInterceptors} from "@angular/common/http";
import {provideClientHydration, withEventReplay} from '@angular/platform-browser';
import {authInterceptor} from "./Services/AuthService/auth.interceptor";


export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes), provideAnimationsAsync(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])), provideClientHydration(withEventReplay()), provideClientHydration()
  ]
};
