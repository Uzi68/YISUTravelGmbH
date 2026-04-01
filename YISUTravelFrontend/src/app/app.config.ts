import { ApplicationConfig, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { PreloadAllModules, provideRouter, withEnabledBlockingInitialNavigation, withPreloading } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {provideHttpClient, withFetch, withInterceptors} from "@angular/common/http";
import {provideClientHydration, withEventReplay} from '@angular/platform-browser';
import {authInterceptor} from "./Services/AuthService/auth.interceptor";


export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes, withEnabledBlockingInitialNavigation(), withPreloading(PreloadAllModules)),
    provideAnimationsAsync(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])), 
    provideClientHydration()
    // EventReplay kann Probleme verursachen wenn Assets noch nicht geladen sind - daher deaktiviert
    // provideClientHydration(withEventReplay())
  ]
};
