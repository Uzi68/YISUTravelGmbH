import { Component } from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from "@angular/material/card";
import {MatFormField, MatLabel} from "@angular/material/form-field";
import {MatInput} from "@angular/material/input";
import {MatButton} from "@angular/material/button";
import {AuthService} from "../../../../Services/AuthService/auth.service";
import {Router} from "@angular/router";
import {response} from "express";

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [
    MatCard,
    MatCardContent,
    MatFormField,
    ReactiveFormsModule,
    MatInput,
    MatLabel,
    MatButton,
    MatCardTitle,
    MatCardHeader

  ],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css'
})
export class AdminLoginComponent {
  contactForm: FormGroup;

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    this.contactForm = this.fb.group ({
      email: ['', Validators.required],
      password: ['', Validators.required]
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
    if (this.contactForm.valid) {
      const credentials = this.contactForm.value;
      this.authService.login(credentials).subscribe({
        next: (response) => {
     //     console.log('Login successful', response);
          this.router.navigate(['/admin-dashboard']);
        },
        error: (err) => {
          console.error('Login failed', err);
        },
      });
    }
  }
}
