import { Component } from '@angular/core';
import {MatToolbar} from "@angular/material/toolbar";
import {MatCard} from "@angular/material/card";
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatFormField, MatLabel} from "@angular/material/form-field";
import {MatInput} from "@angular/material/input";
import {MatOption} from "@angular/material/core";
import {MatSelect} from "@angular/material/select";
import {MatButton, MatFabButton} from "@angular/material/button";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {NgIf} from "@angular/common";


@Component({
  selector: 'app-contact-firstview',
  standalone: true,
  imports: [
    MatToolbar,
    MatCard,
    ReactiveFormsModule,
    MatFormField,
    MatInput,
    MatOption,
    MatSelect,
    MatButton,
    MatLabel,
    NgIf,
    MatFabButton
  ],
  templateUrl: './contact-firstview.component.html',
  styleUrl: './contact-firstview.component.css'
})
export class ContactFirstviewComponent {
  contactForm: FormGroup;
  successMessage: string = '';
  errorMessage: string = '';
  mapLoaded = false;

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      message: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    // Check if the user has already given consent
    const consentGiven = localStorage.getItem('mapConsent');
    if (consentGiven === 'true') {
      this.mapLoaded = true;
    }
  }

  loadMap(): void {
    // Store the user's consent in localStorage
    localStorage.setItem('mapConsent', 'true');
    this.mapLoaded = true;
  }


  onSubmit() {
    if (this.contactForm.valid) {
      const headers = new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded' // Set content type to form-urlencoded
      });

      const body = new URLSearchParams(this.contactForm.value).toString(); // Convert form data to URL encoded string

      // Send form data to PHP backend
      this.http.post('backend/send_mail.php', body, { headers })
        .subscribe(
          (response: any) => {
            if (response.status === 'success') {
              this.successMessage = response.message;
              this.contactForm.reset(); // Reset the form after successful submission
            } else {
              this.errorMessage = response.message;
            }
          },
          error => {
            this.errorMessage = 'Fehler beim Senden des Formulars.';
          }
        );
    }
  }
}
