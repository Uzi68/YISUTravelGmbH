import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { UserManagementService, StaffUser, CreateStaffUserRequest, UpdateStaffUserRequest } from '../../../Services/user-management-service.service';

@Component({
  selector: 'app-staff-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatCardModule,
    MatToolbarModule,
    MatChipsModule,
    MatMenuModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './staff-management.component.html',
  styleUrl: './staff-management.component.css'
})
export class StaffManagementComponent implements OnInit {
  staffUsers: StaffUser[] = [];
  displayedColumns: string[] = ['name', 'email', 'phone', 'roles', 'is_active', 'push_status', 'created_at', 'actions'];
  loading = false;
  showAddForm = false;
  
  addStaffForm: FormGroup;
  editStaffForm: FormGroup;
  editingUser: StaffUser | null = null;

  constructor(
    private userManagementService: UserManagementService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.addStaffForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      phone: [''],
      role: ['Agent', Validators.required],
      is_active: [true]
    });

    this.editStaffForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      role: ['Agent', Validators.required],
      is_active: [true]
    });
  }

  ngOnInit(): void {
    this.loadStaffUsers();
  }

  loadStaffUsers(): void {
    this.loading = true;
    this.userManagementService.getStaffUsers().subscribe({
      next: (users) => {
        this.staffUsers = users;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading staff users:', error);
        this.snackBar.open('Fehler beim Laden der Mitarbeiter', 'Schließen', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm) {
      this.addStaffForm.reset({
        role: 'Agent',
        is_active: true
      });
    }
  }

  addStaffUser(): void {
    if (this.addStaffForm.valid) {
      const formData = this.addStaffForm.value as CreateStaffUserRequest;
      
      this.userManagementService.createStaffUser(formData).subscribe({
        next: (response) => {
          this.snackBar.open('Mitarbeiter erfolgreich erstellt', 'Schließen', { duration: 3000 });
          this.loadStaffUsers();
          this.toggleAddForm();
        },
        error: (error) => {
          console.error('Error creating staff user:', error);
          if (error.error?.errors) {
            const errors = Object.values(error.error.errors).flat();
            this.snackBar.open(`Fehler: ${errors.join(', ')}`, 'Schließen', { duration: 5000 });
          } else {
            this.snackBar.open('Fehler beim Erstellen des Mitarbeiters', 'Schließen', { duration: 3000 });
          }
        }
      });
    }
  }

  editStaffUser(user: StaffUser): void {
    this.editingUser = user;
    this.editStaffForm.patchValue({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      role: user.roles[0] || 'Agent',
      is_active: user.is_active
    });
  }

  updateStaffUser(): void {
    if (this.editStaffForm.valid && this.editingUser) {
      const formData = this.editStaffForm.value as UpdateStaffUserRequest;
      
      this.userManagementService.updateStaffUser(this.editingUser.id, formData).subscribe({
        next: (response) => {
          this.snackBar.open('Mitarbeiter erfolgreich aktualisiert', 'Schließen', { duration: 3000 });
          this.loadStaffUsers();
          this.cancelEdit();
        },
        error: (error) => {
          console.error('Error updating staff user:', error);
          if (error.error?.errors) {
            const errors = Object.values(error.error.errors).flat();
            this.snackBar.open(`Fehler: ${errors.join(', ')}`, 'Schließen', { duration: 5000 });
          } else {
            this.snackBar.open('Fehler beim Aktualisieren des Mitarbeiters', 'Schließen', { duration: 3000 });
          }
        }
      });
    }
  }

  cancelEdit(): void {
    this.editingUser = null;
    this.editStaffForm.reset();
  }

  deleteStaffUser(user: StaffUser): void {
    if (confirm(`Möchten Sie ${user.name} wirklich löschen?`)) {
      this.userManagementService.deleteStaffUser(user.id).subscribe({
        next: (response) => {
          this.snackBar.open('Mitarbeiter erfolgreich gelöscht', 'Schließen', { duration: 3000 });
          this.loadStaffUsers();
        },
        error: (error) => {
          console.error('Error deleting staff user:', error);
          if (error.error?.error) {
            this.snackBar.open(`Fehler: ${error.error.error}`, 'Schließen', { duration: 5000 });
          } else {
            this.snackBar.open('Fehler beim Löschen des Mitarbeiters', 'Schließen', { duration: 3000 });
          }
        }
      });
    }
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'Admin': return 'primary';
      case 'Agent': return 'accent';
      default: return 'basic';
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

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('de-DE');
  }

  formatDateTime(dateString?: string | null): string {
    if (!dateString) {
      return '-';
    }
    return new Date(dateString).toLocaleString('de-DE');
  }
}
