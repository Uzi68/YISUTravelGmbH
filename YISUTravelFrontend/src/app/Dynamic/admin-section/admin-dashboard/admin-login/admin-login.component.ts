import { Component } from '@angular/core';
import {CommonModule} from "@angular/common";
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from "@angular/material/card";
import {MatFormField, MatLabel} from "@angular/material/form-field";
import {MatInput} from "@angular/material/input";
import {MatButton} from "@angular/material/button";
import {MatProgressSpinner} from "@angular/material/progress-spinner";
import {MatIcon} from "@angular/material/icon";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {finalize} from "rxjs";
import {AuthService} from "../../../../Services/AuthService/auth.service";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [
    CommonModule,
    MatCard,
    MatCardContent,
    MatFormField,
    ReactiveFormsModule,
    MatInput,
    MatLabel,
    MatButton,
    MatCardTitle,
    MatCardHeader,
    MatProgressSpinner,
    MatIcon,
    MatCheckboxModule,
    RouterLink

  ],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css'
})
export class AdminLoginComponent {
  contactForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  private returnUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.contactForm = this.fb.group ({
      email: ['', Validators.required],
      password: ['', Validators.required],
      remember: [false]
    });

    this.route.queryParamMap.subscribe(params => {
      this.returnUrl = params.get('returnUrl');
    });
  }

  /*
  callXSFR() {
    this.authService.getCsrfToken().subscribe(response => {
      console.log('CSRF Token obtained');
    }, error => {
      console.error('Error obtaining CSRF token:', error);
    });
  }
  */

  checkAuth()  {
    this.authService.checkAuth().subscribe( response => {
 //     console.log(response);
    })

    this.authService.test().subscribe(response => {
  //    console.log(response);
    })
  }



  onsubmit(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    const credentials = this.contactForm.value;
    this.isLoading = true;
    this.errorMessage = null;

    this.authService.login(credentials).pipe(
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe({
      next: (response) => {
        const roles: string[] = Array.isArray(response?.roles) ? response.roles : [];

        if (roles.includes('Admin') || roles.includes('Agent')) {
          this.navigateAfterLogin();
        } else if (roles.includes('User')) {
          this.router.navigate(['/customer-dashboard']);
        } else {
          console.warn('Unbekannte Rollen für angemeldeten Benutzer', roles);
          this.router.navigate(['/admin-login']);
        }
      },
      error: (err) => {
        console.error('Login failed', err);
        if (err?.status === 401 || err?.status === 422) {
          this.errorMessage = 'E-Mail oder Passwort ist falsch. Bitte prüfen und erneut versuchen.';
        } else if (err?.error?.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'Die Anmeldung ist fehlgeschlagen. Bitte versuchen Sie es später erneut.';
        }
      },
    });
  }

  private navigateAfterLogin(): void {
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl).catch(() => {
        this.router.navigate(['/admin-dashboard']);
      });
    } else {
      this.router.navigate(['/admin-dashboard']);
    }
  }

  goToPasswordReset(): void {
    this.router.navigate(['/password-reset']);
  }

  goToCustomerRegistration(): void {
    this.router.navigate(['/kunden-registrierung']);
  }
}
