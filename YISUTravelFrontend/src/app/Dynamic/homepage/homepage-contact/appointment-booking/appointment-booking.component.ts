import { Component, OnInit, AfterViewInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatDateFormats, NativeDateAdapter } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppointmentService } from '../../../../Services/appointment-service/appointment.service';
import { Appointment, AppointmentFormData } from '../../../../Models/Appointment';

export class GermanDateAdapter extends NativeDateAdapter {
  override format(date: Date, displayFormat: any): string {
    if (displayFormat === 'input') {
      const day = this._to2digit(date.getDate());
      const month = this._to2digit(date.getMonth() + 1);
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    }
    return super.format(date, displayFormat);
  }

  private _to2digit(value: number): string {
    return value.toString().padStart(2, '0');
  }
}

export const GERMAN_DATE_FORMATS: MatDateFormats = {
  parse: {
    dateInput: 'DD.MM.YYYY'
  },
  display: {
    dateInput: 'input',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY'
  }
};

@Component({
  selector: 'app-appointment-booking',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './appointment-booking.component.html',
  styleUrl: './appointment-booking.component.css',
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'de-DE' },
    { provide: DateAdapter, useClass: GermanDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: GERMAN_DATE_FORMATS }
  ]
})
export class AppointmentBookingComponent implements OnInit, AfterViewInit {
  @ViewChild('stepper') stepper!: MatStepper;
  
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private appointmentService = inject(AppointmentService);
  private dateAdapter = inject<DateAdapter<Date>>(DateAdapter);

  // Form groups for each step
  personalDataForm!: FormGroup;
  appointmentForm!: FormGroup;
  messageForm!: FormGroup;

  // Date and time selection
  minDate: Date;
  minDateString: string;
  selectedDate: string | null = null;
  selectedTime: string | null = null;
  selectedTimes: string[] = []; // Multiple time selection
  availableSlots: string[] = [];
  allPossibleSlots: string[] = [];
  blockedSlots: string[] = []; // Blocked slots for selected date
  isLoadingSlots = false;
  customTime: string = '';
  
  // Business hours
  businessHours = {
    weekdays: { start: '10:00', end: '18:00' },
    saturday: { start: '10:30', end: '15:30' }
  };

  // Form submission
  isSubmitting = false;


  constructor() {
    this.dateAdapter.setLocale('de-DE');

    // Set minimum date to today
    const today = new Date();
    this.minDate = today;
    
    // Create date string without timezone issues
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.minDateString = `${year}-${month}-${day}`;
  }

  ngOnInit(): void {
    this.initializeForms();
  }

  ngAfterViewInit(): void {
    // Prevent automatic scrolling when changing steps
    if (this.stepper) {
      this.stepper.selectionChange.subscribe(() => {
        // Prevent scrolling to the top
        setTimeout(() => {
          const currentScrollY = window.scrollY;
          if (currentScrollY > 0) {
            window.scrollTo(0, currentScrollY);
          }
        }, 0);
      });
    }
  }

  private initializeForms(): void {
    // Personal data form
    this.personalDataForm = this.fb.group({
      customer_name: ['', [Validators.required, Validators.minLength(2)]],
      customer_email: ['', [Validators.required, Validators.email]],
      customer_phone: ['', [Validators.required, Validators.pattern(/^[\+]?[0-9\s\-\(\)]{10,}$/)]]
    });

    // Appointment form
    this.appointmentForm = this.fb.group({
      appointment_date: [null, Validators.required]
    });

    // Message form
    this.messageForm = this.fb.group({
      service_type: ['beratung', [Validators.required]],
      message: ['', Validators.maxLength(1000)]
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  onDatePickerChange(date: Date | null): void {
    if (date) {
      // Create date string without timezone issues
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      this.selectedDate = dateString;
      this.loadAvailableTimeSlots(dateString);
      this.loadBlockedSlots(dateString);
    } else {
      this.selectedDate = null;
      this.availableSlots = [];
      this.blockedSlots = [];
      this.selectedTime = null;
    }
  }

  onDateChange(event: any): void {
    const selectedDate = event.target.value;
    if (selectedDate) {
      this.selectedDate = selectedDate;
      // Update the form control to make the form valid
      this.appointmentForm.patchValue({ appointment_date: selectedDate });
      this.loadAvailableTimeSlots(selectedDate);
    } else {
      this.selectedDate = null;
      this.appointmentForm.patchValue({ appointment_date: '' });
      this.availableSlots = [];
      this.selectedTime = null;
    }
  }

  private loadAvailableTimeSlots(date: string): void {
    this.isLoadingSlots = true;
    this.availableSlots = [];
    this.allPossibleSlots = [];
    this.selectedTime = null;

    // Generate all possible slots first
    this.allPossibleSlots = this.generateTimeSlots(date);

    // Load available slots from backend
    this.appointmentService.getAvailableSlots(date).subscribe({
      next: (response: any) => {
        this.availableSlots = response.available_slots || [];
        this.isLoadingSlots = false;
      },
      error: (error) => {
        console.error('Error loading available slots:', error);
        // Fallback to generated slots if API fails
        this.availableSlots = this.allPossibleSlots;
        this.isLoadingSlots = false;
      }
    });
  }

  private loadBlockedSlots(date: string): void {
    // Load blocked slots from the blocked_slots table
    this.appointmentService.getBlockedSlots(date).subscribe({
      next: (response: any) => {
        // Extract time strings from blocked slots array
        this.blockedSlots = (response.blocked_slots || []).map((slot: any) => slot.time || slot);
      },
      error: (error) => {
        console.error('Error loading blocked slots:', error);
        this.blockedSlots = [];
      }
    });
  }

  private generateTimeSlots(date: string): string[] {
    const slots: string[] = [];
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
    
    let startTime: string;
    let endTime: string;
    
    if (dayOfWeek === 6) { // Saturday
      startTime = this.businessHours.saturday.start;
      endTime = this.businessHours.saturday.end;
    } else if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
      startTime = this.businessHours.weekdays.start;
      endTime = this.businessHours.weekdays.end;
    } else { // Sunday - closed
      return [];
    }
    
    // Parse start and end times
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    // Generate 30-minute slots
    let currentHour = startHour;
    let currentMin = startMin;
    
    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
      slots.push(timeString);
      
      // Add 30 minutes
      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour++;
      }
    }
    
    return slots;
  }

  selectTimeSlot(slot: string): void {
    this.selectedTime = slot;
  }

  isAppointmentValid(): boolean {
    return !!(this.appointmentForm.get('appointment_date')?.valid && this.selectedTime);
  }


  getFormattedDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getDisplayDateFormat(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getServiceTypeLabel(serviceType: string | null | undefined): string {
    if (!serviceType) {
      return 'Reiseberatung'; // Default fallback
    }
    
    const serviceTypes: { [key: string]: string } = {
      'flight': 'Flugbuchung',
      'hotel': 'Hotelbuchung',
      'package': 'Pauschalreise',
      'custom': 'Individuelle Reise',
      'consultation': 'Reiseberatung',
      'beratung': 'Reiseberatung',
      'buchung': 'Buchung',
      'visum': 'Visum-Service',
      'sonstiges': 'Sonstiges'
    };
    
    return serviceTypes[serviceType] || serviceType;
  }

  getSelectedTimesDisplay(): string {
    return this.selectedTime ? `${this.selectedTime} Uhr` : '';
  }

  isMessageValid(): boolean {
    return this.messageForm.valid;
  }


  submitAppointment(): void {
    if (!this.isAllFormsValid()) {
      this.snackBar.open('Bitte füllen Sie alle Pflichtfelder aus', 'OK', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.isSubmitting = true;

    try {
      const appointmentData: AppointmentFormData = {
        customer_name: this.personalDataForm.get('customer_name')?.value,
        customer_email: this.personalDataForm.get('customer_email')?.value,
        customer_phone: this.personalDataForm.get('customer_phone')?.value,
        appointment_date: this.selectedDate!,
        appointment_time: this.selectedTime!,
        service_type: this.messageForm.get('service_type')?.value || 'beratung',
        message: this.messageForm.get('message')?.value || null
      };

      this.appointmentService.createAppointment(appointmentData).subscribe({
        next: (response: any) => {
          this.snackBar.open('Termin erfolgreich gebucht! Wir melden uns bald bei Ihnen.', 'OK', {
            duration: 5000,
            panelClass: ['success-snackbar']
          });

          // Navigate back to homepage after successful booking
          setTimeout(() => {
            this.router.navigate(['/']);
          }, 2000);
        },
        error: (error: any) => {
          // Error booking appointment
          
          let errorMessage = 'Fehler beim Buchen des Termins. Bitte versuchen Sie es erneut.';
          
          if (error.error && error.error.message) {
            errorMessage = error.error.message;
          } else if (error.status === 422 && error.error && error.error.errors) {
            // Validation errors
            const errors = error.error.errors;
            const firstError = Object.values(errors)[0];
            if (Array.isArray(firstError) && firstError.length > 0) {
              errorMessage = firstError[0] as string;
            }
          }
          
          this.snackBar.open(errorMessage, 'OK', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });

    } catch (error: any) {
      // Error booking appointment
      this.snackBar.open('Fehler beim Buchen des Termins. Bitte versuchen Sie es erneut.', 'OK', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      this.isSubmitting = false;
    }
  }

  private isAllFormsValid(): boolean {
    return this.personalDataForm.valid &&
           !!(this.appointmentForm.get('appointment_date')?.valid) &&
           this.messageForm.valid &&
           !!this.selectedTime;
  }

  isSlotBlocked(slot: string): boolean {
    // A slot is blocked if it's in the blocked_slots table
    return this.blockedSlots.includes(slot);
  }

  isSlotAvailable(slot: string): boolean {
    // A slot is available if it's in the available slots from backend AND not blocked
    return this.availableSlots.includes(slot) && !this.isSlotBlocked(slot);
  }

}