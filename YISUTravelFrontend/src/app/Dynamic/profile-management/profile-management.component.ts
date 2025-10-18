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
import { Router } from '@angular/router';

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
  profileImageUrl: string | null = null;
  selectedFile: File | null = null;
  
  profileForm: FormGroup;
  passwordForm: FormGroup;

  constructor(
    private userManagementService: UserManagementService,
    private authService: AuthService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private router: Router
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
        this.profileImageUrl = profile.profile_image_url;
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

  getRoleIcon(role: string): string {
    switch (role) {
      case 'Admin': return 'admin_panel_settings';
      case 'Agent': return 'support_agent';
      case 'User': return 'person';
      default: return 'person';
    }
  }

  getFullImageUrl(imageUrl: string): string {
    if (!imageUrl) return '';
    
    // If it's already a full URL, return as is
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    // If it starts with /storage, prepend the backend URL
    if (imageUrl.startsWith('/storage')) {
      return 'http://localhost:8000' + imageUrl;
    }
    
    // Otherwise, assume it's a relative path and prepend backend URL
    return 'http://localhost:8000/storage/' + imageUrl;
  }

  // Profile Image Methods
  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.snackBar.open('Bitte wählen Sie eine gültige Bilddatei aus.', 'Schließen', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.snackBar.open('Die Bilddatei ist zu groß. Maximale Größe: 5MB', 'Schließen', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        return;
      }

      this.selectedFile = file;
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profileImageUrl = e.target.result;
      };
      reader.readAsDataURL(file);

      // Upload image
      this.uploadProfileImage(file);
    }
  }

  uploadProfileImage(file: File): void {
    this.loading = true;
    
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('profile_image', file);

    // Call backend API to upload the image
    this.userManagementService.uploadProfileImage(formData).subscribe({
      next: (response) => {
        this.loading = false;
        this.profileImageUrl = response.profile_image_url;
        this.snackBar.open('Profilbild erfolgreich hochgeladen!', 'Schließen', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open('Fehler beim Hochladen des Profilbildes', 'Schließen', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        console.error('Upload error:', error);
      }
    });
  }

  removeProfileImage(): void {
    this.loading = true;
    
    // Call backend API to remove the image
    this.userManagementService.removeProfileImage().subscribe({
      next: (response) => {
        this.loading = false;
        this.profileImageUrl = null;
        this.selectedFile = null;
        this.snackBar.open('Profilbild entfernt!', 'Schließen', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
      },
      error: (error) => {
        this.loading = false;
        this.snackBar.open('Fehler beim Entfernen des Profilbildes', 'Schließen', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        console.error('Remove error:', error);
      }
    });
  }

  goToLivechatDashboard(): void {
    // Navigate to the livechat dashboard
    this.router.navigate(['/admin/livechat-dashboard']);
  }
}