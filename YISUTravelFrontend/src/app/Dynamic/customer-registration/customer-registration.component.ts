import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';

import { CustomerService, CustomerRegistrationRequest } from '../../Services/customer-service.service';
import { AuthService } from '../../Services/AuthService/auth.service';

@Component({
  selector: 'app-customer-registration',
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
    MatProgressSpinnerModule
  ],
  templateUrl: './customer-registration.component.html',
  styleUrl: './customer-registration.component.css'
})
export class CustomerRegistrationComponent implements OnInit {
  registrationForm: FormGroup;
  loading = false;

  constructor(
    private customerService: CustomerService,
    private authService: AuthService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.registrationForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Check if user is already logged in
    this.authService.getAuthenticated().subscribe(auth => {
      if (auth) {
        this.router.navigate(['/customer-dashboard']);
      }
    });
  }

  register(): void {
    if (this.registrationForm.valid) {
      this.loading = true;
      const formData = this.registrationForm.value as CustomerRegistrationRequest;
      
      this.customerService.register(formData).subscribe({
        next: (response) => {
          this.snackBar.open('Registrierung erfolgreich! Willkommen bei YISU Travel', 'Schließen', { duration: 5000 });
          // Set authentication state after successful registration
          this.authService.setAuthenticated(true);
          this.router.navigate(['/customer-dashboard']);
        },
        error: (error) => {
          console.error('Error registering customer:', error);
          console.error('Error details:', error.error);
          if (error.error?.errors) {
            const errors = Object.values(error.error.errors).flat();
            this.snackBar.open(`Fehler: ${errors.join(', ')}`, 'Schließen', { duration: 5000 });
          } else {
            this.snackBar.open('Fehler bei der Registrierung', 'Schließen', { duration: 3000 });
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
}