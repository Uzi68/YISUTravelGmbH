import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FormsModule } from '@angular/forms';
import { OfferService, Offer, CreateOfferRequest } from '../../../Services/offer.service';

export interface OfferDialogData {
  offer?: Offer;
  isEdit: boolean;
}

@Component({
  selector: 'app-offer-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule
  ],
  templateUrl: './offer-dialog.component.html',
  styleUrl: './offer-dialog.component.css'
})
export class OfferDialogComponent implements OnInit {
  offerForm: FormGroup;
  loading = false;
  highlights: string[] = [];
  imagePreviewUrl: string | null = null;
  uploading = false;
  selectedImageFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<OfferDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: OfferDialogData,
    private offerService: OfferService,
    private snackBar: MatSnackBar
  ) {
    this.offerForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.data.isEdit && this.data.offer) {
      this.loadOfferData();
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', [Validators.required]],
      location: ['', [Validators.required, Validators.maxLength(255)]],
      image_url: [''],
      price: ['', [Validators.required, Validators.min(0)]],
      currency: ['EUR'],
      rating: [4, [Validators.min(1), Validators.max(5)]],
      badge: [''],
      duration: [''],
      inclusions: [''],
      is_featured: [false],
      is_active: [true],
      sort_order: [0]
    });
  }

  private loadOfferData(): void {
    if (this.data.offer) {
      this.offerForm.patchValue({
        title: this.data.offer.title,
        description: this.data.offer.description,
        location: this.data.offer.location,
        image_url: this.data.offer.image_url,
        price: this.data.offer.price,
        currency: this.data.offer.currency,
        rating: this.data.offer.rating,
        badge: this.data.offer.badge,
        duration: this.data.offer.duration,
        inclusions: this.data.offer.inclusions,
        is_featured: this.data.offer.is_featured,
        is_active: this.data.offer.is_active,
        sort_order: this.data.offer.sort_order
      });
      this.highlights = this.data.offer.highlights || [];
    }
  }

  addHighlight(): void {
    this.highlights.push('');
  }

  removeHighlight(index: number): void {
    this.highlights.splice(index, 1);
  }

  trackByIndex(index: number): number {
    return index;
  }

  onSubmit(): void {
    if (this.offerForm.valid) {
      this.loading = true;
      
      // FormData für Bild-Upload vorbereiten
      const formData = new FormData();
      const offerData = {
        ...this.offerForm.value,
        highlights: this.highlights.filter(h => h.trim() !== '')
      };

      // Alle Felder zu FormData hinzufügen
      Object.keys(offerData).forEach(key => {
        if (offerData[key] !== null && offerData[key] !== undefined) {
          if (key === 'highlights') {
            formData.append(key, JSON.stringify(offerData[key]));
          } else if (typeof offerData[key] === 'boolean') {
            // Booleans als String senden (Laravel erwartet 'true'/'false' oder '1'/'0')
            formData.append(key, offerData[key] ? '1' : '0');
          } else if (Array.isArray(offerData[key])) {
            // Arrays als JSON-String senden
            formData.append(key, JSON.stringify(offerData[key]));
          } else {
            formData.append(key, offerData[key]);
          }
        }
      });

      // Bild hinzufügen falls ausgewählt
      if (this.selectedImageFile) {
        formData.append('image', this.selectedImageFile);
      }

      const request = this.data.isEdit && this.data.offer
        ? this.offerService.updateOffer(this.data.offer.id, formData)
        : this.offerService.createOffer(formData);

      request.subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open(
              this.data.isEdit ? 'Angebot erfolgreich aktualisiert' : 'Angebot erfolgreich erstellt',
              'Schließen',
              { duration: 3000 }
            );
            this.dialogRef.close(response.data);
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error saving offer:', error);
          let errorMessage = 'Fehler beim Speichern des Angebots.';
          if (error.error && error.error.message) {
            errorMessage = error.error.message;
          }
          if (error.error && error.error.errors) {
            console.log('Validation errors:', error.error.errors);
            // Display specific validation errors
            for (const key in error.error.errors) {
              if (error.error.errors.hasOwnProperty(key)) {
                errorMessage += `\n${key}: ${error.error.errors[key].join(', ')}`;
              }
            }
          }
          this.snackBar.open(errorMessage, 'OK', { duration: 5000 });
          this.loading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.offerForm.controls).forEach(key => {
      const control = this.offerForm.get(key);
      control?.markAsTouched();
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getFieldError(fieldName: string): string {
    const field = this.offerForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return 'Dieses Feld ist erforderlich';
      }
      if (field.errors['maxlength']) {
        return `Maximal ${field.errors['maxlength'].requiredLength} Zeichen`;
      }
      if (field.errors['min']) {
        return `Mindestens ${field.errors['min'].min}`;
      }
      if (field.errors['max']) {
        return `Maximal ${field.errors['max'].max}`;
      }
    }
    return '';
  }

  // Bild-Upload-Methoden
  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Dateigröße prüfen (5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.snackBar.open('Datei ist zu groß. Maximal 5MB erlaubt.', 'OK', { duration: 3000 });
        return;
      }

      // Dateityp prüfen
      if (!file.type.startsWith('image/')) {
        this.snackBar.open('Nur Bilddateien sind erlaubt.', 'OK', { duration: 3000 });
        return;
      }

      this.uploading = true;
      
      // Vorschau anzeigen
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreviewUrl = e.target.result;
      };
      reader.readAsDataURL(file);

      // Datei wird beim Submit hochgeladen
      this.selectedImageFile = file;
      this.uploading = false;
      this.snackBar.open('Bild ausgewählt! Wird beim Speichern hochgeladen.', 'OK', { duration: 2000 });
    }
  }

  removeImage(): void {
    this.imagePreviewUrl = null;
    this.selectedImageFile = null;
    this.offerForm.patchValue({ image_url: '' });
  }
}
