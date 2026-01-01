import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { catchError, map } from 'rxjs/operators';
import {of} from "rxjs";

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const requiredRoles = route.data?.['roles'] as string[] | undefined;

  // Prüfe die Authentifizierung über das Backend (wegen HttpOnly-Cookie)
  return authService.getUserRole().pipe(
    map((response) => {
      const roles = Array.isArray(response.role) ? response.role : [];
      const hasRequiredRole =
        !requiredRoles || requiredRoles.some((role) => roles.includes(role));

      if (hasRequiredRole) {
        return true; // Zugriff gewährt
      }

      if (roles.includes('User')) {
        router.navigate(['/customer-dashboard']);
        return false;
      }

      if (roles.includes('Admin') || roles.includes('Agent')) {
        router.navigate(['/admin-dashboard']);
        return false;
      }

      router.navigate(['/admin-login']);
      return false;
      //Überprüfe ob User Admin ist
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
      const roles = Array.isArray(response.role) ? response.role : [];

      if (roles.includes('Admin')) {
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
