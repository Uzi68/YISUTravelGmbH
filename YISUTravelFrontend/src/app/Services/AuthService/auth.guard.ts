import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { catchError, map } from 'rxjs/operators';
import {of} from "rxjs";

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  // Prüfe die Authentifizierung über das Backend (wegen HttpOnly-Cookie)
  return authService.getUserRole().pipe(
    map((response) => {

      //Überprüfe ob User Admin ist
      if (response.role.includes('Admin') || response.role.includes('Agent')) {
        return true; // Zugriff gewährt
      } else {

        router.navigate(['/admin-login']); //Benutzer ist kein Admin => umleiten
        return false;
      }
    }),
    catchError(() => {
      // Fehler bei der API-Abfrage (z. B. ungültiges Cookie), Umleitung zum Login
      router.navigate(['/admin-login'], { queryParams: { returnUrl: state.url } });
      return of(false);
    })
  );
};



// Guard nur für Admins
export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return authService.getUserRole().pipe(
    map((response) => {
      if (response.role.includes('Admin')) {
        return true; // Zugriff nur für Admin
      } else {
        router.navigate(['/admin-login']);
        return false;
      }
    }),
    catchError(() => {
      router.navigate(['/admin-login'], { queryParams: { returnUrl: state.url } });
      return of(false);
    })
  );
};
