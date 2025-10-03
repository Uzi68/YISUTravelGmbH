import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const csrfToken = authService.getCookie('XSRF-TOKEN');

  // Falls ein CSRF-Token vorhanden ist, füge es dem Header hinzu
  if (csrfToken) {
    req = req.clone({
      setHeaders: {
        'X-XSRF-TOKEN': csrfToken,
      },
    });
  }

  // Führe die Anfrage mit den modifizierten Headern aus
  return next(req);
};
