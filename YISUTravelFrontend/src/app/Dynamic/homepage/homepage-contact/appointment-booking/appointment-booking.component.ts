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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { AppointmentService } from '../../../../Services/appointment-service/appointment.service';
import { Appointment, AppointmentFormData } from '../../../../Models/Appointment';

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
    MatTooltipModule,
    MatSnackBarModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './appointment-booking.component.html',
  styleUrl: './appointment-booking.component.css'
})
export class AppointmentBookingComponent implements OnInit, AfterViewInit {
  @ViewChild('stepper') stepper!: MatStepper;
  
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private appointmentService = inject(AppointmentService);

  // Form groups for each step
  personalDataForm!: FormGroup;
  appointmentForm!: FormGroup;
  travelDetailsForm!: FormGroup;
  messageForm!: FormGroup;

  // Date and time selection
  minDate: Date;
  minDateString: string;
  selectedDate: string | null = null;
  selectedTime: string | null = null;
  selectedTimes: string[] = []; // Multiple time selection
  availableSlots: string[] = [];
  isLoadingSlots = false;
  customTime: string = '';
  
  // Business hours
  businessHours = {
    weekdays: { start: '10:00', end: '18:00' },
    saturday: { start: '10:30', end: '15:30' }
  };

  // Form submission
  isSubmitting = false;

  // Service types and budget ranges
  serviceTypes = [
    { value: 'flight', label: 'Flugbuchung' },
    { value: 'hotel', label: 'Hotelbuchung' },
    { value: 'package', label: 'Pauschalreise' },
    { value: 'custom', label: 'Individuelle Reise' },
    { value: 'consultation', label: 'Reiseberatung' }
  ];

  budgetRanges = [
    { value: 'under-1000', label: 'Unter 1.000 €' },
    { value: '1000-2500', label: '1.000 - 2.500 €' },
    { value: '2500-5000', label: '2.500 - 5.000 €' },
    { value: '5000-10000', label: '5.000 - 10.000 €' },
    { value: 'over-10000', label: 'Über 10.000 €' }
  ];

  constructor() {
    // Set minimum date to today
    const today = new Date();
    this.minDate = today;
    this.minDateString = today.toISOString().split('T')[0];
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

    // Travel details form
    this.travelDetailsForm = this.fb.group({
      service_type: ['', Validators.required],
      travelers_count: [1, [Validators.required, Validators.min(1), Validators.max(20)]],
      destination: [''],
      budget_range: ['']
    });

    // Message form
    this.messageForm = this.fb.group({
      message: ['', Validators.maxLength(1000)]
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  onDateChange(event: any): void {
    const selectedDate = event.target.value;
    console.log('Date changed:', selectedDate); // Debug log
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

  onDatePickerChange(date: Date | null): void {
    if (date) {
      const selectedDate = date.toISOString().split('T')[0];
      console.log('Date picker changed:', selectedDate); // Debug log
      this.selectedDate = selectedDate;
      this.loadAvailableTimeSlots(selectedDate);
    } else {
      this.selectedDate = null;
      this.availableSlots = [];
      this.selectedTime = null;
    }
  }

  private loadAvailableTimeSlots(date: string): void {
    console.log('Loading time slots for date:', date); // Debug log
    this.isLoadingSlots = true;
    this.availableSlots = [];
    this.selectedTime = null;
    this.customTime = '';

    // Simulate API call to get available slots
    setTimeout(() => {
      // Generate time slots based on business hours and day of week
      const slots = this.generateTimeSlots(date);
      console.log('Generated slots:', slots); // Debug log
      this.availableSlots = slots;
      this.isLoadingSlots = false;
    }, 1000);
  }

  private generateTimeSlots(date: string): string[] {
    const slots: string[] = [];
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
    
    console.log('Generating slots for:', date, 'Day of week:', dayOfWeek); // Debug log
    
    let startTime: string;
    let endTime: string;
    
    if (dayOfWeek === 6) { // Saturday
      startTime = this.businessHours.saturday.start;
      endTime = this.businessHours.saturday.end;
      console.log('Saturday hours:', startTime, '-', endTime); // Debug log
    } else if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
      startTime = this.businessHours.weekdays.start;
      endTime = this.businessHours.weekdays.end;
      console.log('Weekday hours:', startTime, '-', endTime); // Debug log
    } else { // Sunday - closed
      console.log('Sunday - closed'); // Debug log
      return [];
    }
    
    // Parse start and end times
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    console.log('Parsed times - Start:', startHour, ':', startMin, 'End:', endHour, ':', endMin); // Debug log
    
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
    
    console.log('Final slots array:', slots); // Debug log
    return slots;
  }

  selectTimeSlot(slot: string): void {
    this.selectedTime = slot;
    console.log('Selected time slot:', slot);
  }

  onCustomTimeChange(event: any): void {
    this.customTime = event.target.value;
  }

  isCustomTimeValid(): boolean {
    if (!this.customTime) return false;
    
    const [hours, minutes] = this.customTime.split(':').map(Number);
    const selectedDate = new Date(this.selectedDate!);
    const dayOfWeek = selectedDate.getDay();
    
    let startTime: string;
    let endTime: string;
    
    if (dayOfWeek === 6) { // Saturday
      startTime = this.businessHours.saturday.start;
      endTime = this.businessHours.saturday.end;
    } else if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
      startTime = this.businessHours.weekdays.start;
      endTime = this.businessHours.weekdays.end;
    } else { // Sunday - closed
      return false;
    }
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const customMinutes = hours * 60 + minutes;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return customMinutes >= startMinutes && customMinutes <= endMinutes;
  }

  addCustomTime(): void {
    if (this.customTime && this.isCustomTimeValid()) {
      this.selectedTime = this.customTime;
      this.customTime = '';
      console.log('Added custom time:', this.selectedTime);
    }
  }

  isAppointmentValid(): boolean {
    return !!(this.appointmentForm.get('appointment_date')?.valid && this.selectedTime);
  }

  isTravelDetailsValid(): boolean {
    return this.travelDetailsForm.valid;
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

  getSelectedTimesDisplay(): string {
    return this.selectedTime ? `${this.selectedTime} Uhr` : '';
  }

  isMessageValid(): boolean {
    return this.messageForm.valid;
  }

  getServiceTypeLabel(value: string): string {
    const service = this.serviceTypes.find(s => s.value === value);
    return service ? service.label : value;
  }

  getBudgetRangeLabel(value: string): string {
    const budget = this.budgetRanges.find(b => b.value === value);
    return budget ? budget.label : value;
  }

  async submitAppointment(): Promise<void> {
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
        service_type: this.travelDetailsForm.get('service_type')?.value,
        travelers_count: this.travelDetailsForm.get('travelers_count')?.value,
        destination: this.travelDetailsForm.get('destination')?.value || null,
        budget_range: this.travelDetailsForm.get('budget_range')?.value || null,
        message: this.messageForm.get('message')?.value || null
      };

      await this.appointmentService.createAppointment(appointmentData);

      this.snackBar.open('Termin erfolgreich gebucht! Wir melden uns bald bei Ihnen.', 'OK', {
        duration: 5000,
        panelClass: ['success-snackbar']
      });

      // Navigate back to homepage after successful booking
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 2000);

    } catch (error: any) {
      console.error('Error booking appointment:', error);
      this.snackBar.open('Fehler beim Buchen des Termins. Bitte versuchen Sie es erneut.', 'OK', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isSubmitting = false;
    }
  }

  private isAllFormsValid(): boolean {
    return this.personalDataForm.valid &&
           !!(this.appointmentForm.get('appointment_date')?.valid) &&
           this.travelDetailsForm.valid &&
           this.messageForm.valid &&
           !!this.selectedTime;
  }

}