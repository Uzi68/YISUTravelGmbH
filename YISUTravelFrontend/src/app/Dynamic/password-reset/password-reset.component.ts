import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';

import { UserManagementService, PasswordResetRequest, PasswordResetConfirmRequest } from '../../Services/user-management-service.service';

@Component({
  selector: 'app-password-reset',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatStepperModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './password-reset.component.html',
  styleUrl: './password-reset.component.css'
})
export class PasswordResetComponent implements OnInit {
  step = 1; // 1: Request reset, 2: Reset password
  loading = false;
  emailSent = false;
  token = '';
  email = '';

  requestForm: FormGroup;
  resetForm: FormGroup;

  constructor(
    private userManagementService: UserManagementService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.requestForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Check if we have token and email in URL parameters
    this.route.queryParams.subscribe(params => {
      if (params['token'] && params['email']) {
        this.token = params['token'];
        this.email = params['email'];
        this.step = 2;
        this.resetForm.patchValue({
          email: this.email
        });
      }
    });
  }

  requestPasswordReset(): void {
    if (this.requestForm.valid) {
      this.loading = true;
      const formData = this.requestForm.value as PasswordResetRequest;
      
      this.userManagementService.sendPasswordResetLink(formData).subscribe({
        next: (response) => {
          this.snackBar.open('Passwort-Reset-Link wurde an Ihre E-Mail gesendet', 'Schließen', { duration: 5000 });
          this.emailSent = true;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error sending password reset link:', error);
          if (error.error?.errors) {
            const errors = Object.values(error.error.errors).flat();
            this.snackBar.open(`Fehler: ${errors.join(', ')}`, 'Schließen', { duration: 5000 });
          } else {
            this.snackBar.open('Fehler beim Senden des Reset-Links', 'Schließen', { duration: 3000 });
          }
          this.loading = false;
        }
      });
    }
  }

  resetPassword(): void {
    if (this.resetForm.valid && this.token && this.email) {
      this.loading = true;
      const formData: PasswordResetConfirmRequest = {
        token: this.token,
        email: this.email,
        password: this.resetForm.value.password,
        password_confirmation: this.resetForm.value.password_confirmation
      };
      
      this.userManagementService.resetPassword(formData).subscribe({
        next: (response) => {
          this.snackBar.open('Passwort erfolgreich zurückgesetzt', 'Schließen', { duration: 3000 });
          this.router.navigate(['/login']);
        },
        error: (error) => {
          console.error('Error resetting password:', error);
          if (error.error?.errors) {
            const errors = Object.values(error.error.errors).flat();
            this.snackBar.open(`Fehler: ${errors.join(', ')}`, 'Schließen', { duration: 5000 });
          } else {
            this.snackBar.open('Fehler beim Zurücksetzen des Passworts', 'Schließen', { duration: 3000 });
          }
          this.loading = false;
        }
      });
    }
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const passwordConfirmation = form.get('password_confirmation');
    
    if (password && passwordConfirmation && password.value !== passwordConfirmation.value) {
      passwordConfirmation.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  resendEmail(): void {
    this.emailSent = false;
    this.requestForm.reset();
  }
}