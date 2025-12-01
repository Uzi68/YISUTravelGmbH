import {Inject, Injectable, PLATFORM_ID} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {BehaviorSubject, Observable, of, switchMap, tap, throwError, map} from "rxjs";
import {Router} from "@angular/router";
import {catchError} from "rxjs/operators";
import {isPlatformBrowser} from "@angular/common";
import {response} from "express";
import {User} from "../../Models/User";
import {environment} from "../../../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class AuthService {


  //Cookie is called and the result is set in initialisation (Initialwert)
  private authenticated = new BehaviorSubject<boolean>(this.getPersistedAuthState());

  private apiUrl = environment.apiUrl;
  private apiUrlXSRF = environment.apiUrl.replace('/api', '/sanctum/csrf-cookie');

  constructor(private http: HttpClient, private router: Router, @Inject(PLATFORM_ID) private platformId: Object) {
    this.authenticated.next(this.getPersistedAuthState());
  }

  /*
  login(credentials: { email: string; password: string }): Observable<any> {
    this.setAuthenticated(true);
    return this.http.post(`${this.apiUrl}/login`, credentials, {
      withCredentials: true,
    })

  }
*/

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.getCsrfToken().pipe(
      switchMap(() =>
        this.http.post(`${this.apiUrl}/login`, credentials, {
          withCredentials: true,
        })
      ),
      tap(() => this.setAuthenticated(true))
    );
  }


  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).pipe(
      tap(() => this.setAuthenticated(false)),
      tap(() => this.router.navigate(['/admin-login'])),
      catchError((error) => {
        console.error('Logout fehlgeschlagen', error);
        throw error;
      })
    );
  }

  getUserRole() {
    return this.http.get<{ role: string[] }>(`${this.apiUrl}/user-role`, { withCredentials: true });
  }

  getLoggedUser(): Observable<User> {
    return this.http.get<User>( `${this.apiUrl}/user`, { withCredentials: true });
  }


  //Get XSRF from Backend
  getCsrfToken(): Observable<any> {
    return this.http.get(`${this.apiUrlXSRF}`, { withCredentials: true });
  }

  getCsrfTokenPusher(): string {
    // Lies den XSRF-TOKEN direkt aus dem Cookie
    return this.getCookie('XSRF-TOKEN');
  }

  public getCookie(name: string): string {
    // Check if the code is running in the browser
    if (isPlatformBrowser(this.platformId)) {
      const cookies = document.cookie.split('; ');
      const cookie = cookies.find((row) => row.startsWith(`${name}=`));
      if (cookie) {
        let cookieValue = cookie.split('=')[1];
        cookieValue = cookieValue.replace(/%3D$/, ''); // Decode URL-encoded values if needed
        return cookieValue;
      }
    }
    return ''; // Return empty string if not in the browser or if the cookie is not found
  }

  //Authenticated state to cookies
  private getPersistedAuthState(): boolean {
    const authState = this.getCookie('authenticated');
    return authState === 'true'; // Convert string to boolean
  }


  //Persist authentication state to cookies
  private persistAuthState(isAuthenticated: boolean): void {
    if (isPlatformBrowser(this.platformId)) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);  // Keep native app logins for ~1 month
      document.cookie = `authenticated=${isAuthenticated}; expires=${expirationDate.toUTCString()}; path=/;`;
    }
  }

  //Checking for Authentication
  checkAuth(): Observable<boolean> {
    return this.http.get(`${this.apiUrl}/check-auth`, { withCredentials: true }).pipe(
      map(() => true),
      tap((isAuthenticated) => this.setAuthenticated(isAuthenticated)),
      catchError((error) => {
        this.setAuthenticated(false);

        if (error.status === 401 || error.status === 419) {
          return of(false);
        }

        console.error('Error checking auth:', error);
        return throwError(error);
      })
    );
  }

  test() {
    return this.http.post<any>(`${this.apiUrl}/chatbot/test-input`, {withCredentials:true});
  }

  setAuthenticated(isAuthenticated: boolean) {
    this.authenticated.next(isAuthenticated);
    this.persistAuthState(isAuthenticated);
  }

  getAuthenticated() {
    return this.authenticated.asObservable();
  }

}
