import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { UserManagementService, UserProfile, UpdateProfileRequest, ChangePasswordRequest } from '../../Services/user-management-service.service';
import { AuthService } from '../../Services/AuthService/auth.service';

@Component({
  selector: 'app-profile-management',
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
    MatTabsModule,
    MatDividerModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './profile-management.component.html',
  styleUrl: './profile-management.component.css'
})
export class ProfileManagementComponent implements OnInit {
  profile: UserProfile | null = null;
  loading = false;
  saving = false;
  
  profileForm: FormGroup;
  passwordForm: FormGroup;

  constructor(
    private userManagementService: UserManagementService,
    private authService: AuthService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.profileForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['']
    });

    this.passwordForm = this.fb.group({
      current_password: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    console.log('ProfileManagementComponent initialized');
    this.loadProfile();
  }

  loadProfile(): void {
    console.log('Loading profile...');
    this.loading = true;
    this.userManagementService.getProfile().subscribe({
      next: (profile) => {
        console.log('Profile loaded successfully:', profile);
        this.profile = profile;
        this.profileForm.patchValue({
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          phone: profile.phone
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        this.snackBar.open('Fehler beim Laden des Profils', 'Schließen', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  updateProfile(): void {
    if (this.profileForm.valid) {
      this.saving = true;
      const formData = this.profileForm.value as UpdateProfileRequest;
      
      this.userManagementService.updateProfile(formData).subscribe({
        next: (response) => {
          console.log('Profile update response:', response);
          this.snackBar.open('Profil erfolgreich aktualisiert', 'Schließen', { duration: 3000 });
          
          // Update the profile data immediately from the response
          if (response.user) {
            this.profile = {
              ...this.profile!,
              name: response.user.name,
              first_name: response.user.first_name,
              last_name: response.user.last_name,
              email: response.user.email,
              phone: response.user.phone,
              roles: response.user.roles
            };
            
            // Update the form with new values
            this.profileForm.patchValue({
              first_name: response.user.first_name,
              last_name: response.user.last_name,
              email: response.user.email,
              phone: response.user.phone
            });
          }
          
          this.saving = false;
        },
        error: (error) => {
          console.error('Error updating profile:', error);
          if (error.error?.errors) {
            const errors = Object.values(error.error.errors).flat();
            this.snackBar.open(`Fehler: ${errors.join(', ')}`, 'Schließen', { duration: 5000 });
          } else {
            this.snackBar.open('Fehler beim Aktualisieren des Profils', 'Schließen', { duration: 3000 });
          }
          this.saving = false;
        }
      });
    }
  }

  changePassword(): void {
    if (this.passwordForm.valid) {
      this.saving = true;
      const formData = this.passwordForm.value as ChangePasswordRequest;
      
      this.userManagementService.changePassword(formData).subscribe({
        next: (response) => {
          console.log('Password change response:', response);
          
          if (response.logout_required) {
            this.snackBar.open('Passwort erfolgreich geändert. Sie werden ausgeloggt.', 'Schließen', { duration: 5000 });
            
            // Logout and redirect to login
            setTimeout(() => {
              this.authService.logout().subscribe({
                next: () => {
                  // Redirect to login page
                  window.location.href = '/admin-login';
                },
                error: () => {
                  // Force redirect even if logout fails
                  window.location.href = '/admin-login';
                }
              });
            }, 2000);
          } else {
            this.snackBar.open('Passwort erfolgreich geändert', 'Schließen', { duration: 3000 });
            this.passwordForm.reset();
          }
          
          this.saving = false;
        },
        error: (error) => {
          console.error('Error changing password:', error);
          if (error.error?.error) {
            this.snackBar.open(`Fehler: ${error.error.error}`, 'Schließen', { duration: 5000 });
          } else {
            this.snackBar.open('Fehler beim Ändern des Passworts', 'Schließen', { duration: 3000 });
          }
          this.saving = false;
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

  getRoleColor(role: string): string {
    switch (role) {
      case 'Admin': return 'primary';
      case 'Agent': return 'accent';
      case 'User': return 'basic';
      default: return 'basic';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getUserTypeLabel(userType: string): string {
    switch (userType) {
      case 'staff': return 'Mitarbeiter';
      case 'customer': return 'Kunde';
      default: return userType;
    }
  }
}