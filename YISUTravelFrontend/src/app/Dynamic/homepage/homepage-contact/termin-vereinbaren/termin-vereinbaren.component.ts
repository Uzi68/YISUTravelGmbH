import {ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, model} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from "@angular/forms";
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef, MatDialogTitle
} from "@angular/material/dialog";
import {MatFormField, MatFormFieldModule, MatHint, MatLabel} from "@angular/material/form-field";
import {
  MatDatepicker,
  MatDatepickerInput,
  MatDatepickerModule,
  MatDatepickerToggle
} from "@angular/material/datepicker";
import {MatButton, MatButtonModule} from "@angular/material/button";
import {MatInput, MatInputModule} from "@angular/material/input";
import {MAT_DATE_LOCALE, provideNativeDateAdapter} from "@angular/material/core";
import {AsyncPipe, DatePipe, NgClass, NgForOf, NgIf, registerLocaleData} from "@angular/common";
import {MatIcon} from "@angular/material/icon";
import {NgxMatTimepickerComponent, NgxMatTimepickerDirective, NgxMatTimepickerFieldComponent} from "ngx-mat-timepicker";
import {MatCard} from "@angular/material/card";
import localeDe from '@angular/common/locales/de';
import {TerminvereinbarungService} from "../../../../Services/terminvereinbarung-service/terminvereinbarung.service";
import {Observable, of, Subject, takeUntil} from "rxjs";
import {map} from "rxjs/operators";

@Component({
  selector: 'app-termin-vereinbaren',
  standalone: true,
  providers: [provideNativeDateAdapter(),[{ provide: MAT_DATE_LOCALE, useValue: 'de-DE' }]],
  imports: [
    MatDialogContent,
    MatDialogTitle,
    MatFormField,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatDatepicker,
    MatDialogActions,
    MatDialogClose,
    MatButton,
    MatInput,
    MatHint,
    MatLabel,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    ReactiveFormsModule,
    NgIf,
    FormsModule,
    MatIcon,
    NgxMatTimepickerDirective,
    NgxMatTimepickerComponent,
    MatCard,
    DatePipe,
    NgxMatTimepickerFieldComponent,
    MatButtonModule,
    NgForOf,
    AsyncPipe,
    NgClass
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './termin-vereinbaren.component.html',
  styleUrl: './termin-vereinbaren.component.css'
})
export class TerminVereinbarenComponent {
  dialogRef = inject<MatDialogRef<TerminVereinbarenComponent>>(MatDialogRef);
  form: FormGroup;
  selectedDate: Date | null = null;
  minDate: Date;
  existingAppointments: string[] = [];
  isAppointmentTaken: boolean = false;

  constructor(
    private fb: FormBuilder,
    private terminservice: TerminvereinbarungService,
    private cdRef: ChangeDetectorRef
  ) {
    registerLocaleData(localeDe);

    this.form = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      topic: ['', Validators.required],
      message: ['', Validators.required],
      time: ['', [Validators.required, this.timeValidator.bind(this)]],
      date: ['', Validators.required],
    });

    this.minDate = new Date(); // Mindestdatum auf heute setzen
  }

  resetTime() {
    this.form.get('time')?.setValue(null);
  }

  ngOnInit(): void {
    this.form.get('date')?.valueChanges.subscribe(date => {
      if (date) {
        const normalizedDate = this.stripTimeFromDate(new Date(date));
        this.selectedDate = new Date(date); // Speichert das Datum für die Anzeige
        this.loadExistingAppointments(normalizedDate);
      }
    });

    this.form.get('time')?.valueChanges.subscribe(time => {
      this.checkIfAppointmentIsTaken(); // Überprüft, ob der Termin bereits vergeben ist
    });
  }

  checkIfAppointmentIsTaken(): void {
    const selectedTime = this.form.get('time')?.value; // Ausgewählte Uhrzeit 'HH:mm'
    const selectedDateTime = this.combineDateAndTime(this.selectedDate, selectedTime);

    this.isAppointmentTaken = this.existingAppointments.some(appointment => {
      const appointmentDateTime = this.combineDateAndTime(this.selectedDate, appointment);
      return this.isWithinTimeRange(appointmentDateTime, selectedDateTime);
    });

    this.cdRef.markForCheck(); // UI aktualisieren
  }

// Kombiniert Datum und Uhrzeit zu einem Date-Objekt
  combineDateAndTime(date: Date | null, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const combined = new Date(date!); // ! weil selectedDate garantiert gesetzt ist
    combined.setHours(hours, minutes, 0, 0); // Uhrzeit setzen
    return combined;
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes} Uhr`;
  }


// Prüft, ob eine Uhrzeit innerhalb eines 30-Minuten-Intervalls liegt
  isWithinTimeRange(appointmentTime: Date, selectedTime: Date): boolean {
    const startTime = new Date(appointmentTime);
    startTime.setMinutes(startTime.getMinutes() - 29);

    const endTime = new Date(appointmentTime);
    endTime.setMinutes(endTime.getMinutes() + 29);

    return selectedTime >= startTime && selectedTime <= endTime;
  }


  loadExistingAppointments(date: string): void {
    console.log('Lade Termine für:', date);
    this.terminservice.getAppointments(date).subscribe({
      next: (data) => {
        if (data.success) {
          this.existingAppointments = data.appointments;
          console.log('Uhrzeiten:', this.existingAppointments);
          const selectedTime = this.form.get('time')?.value;
          this.isAppointmentTaken = this.existingAppointments.includes(selectedTime);
          this.cdRef.markForCheck(); // Optimiert für Change Detection
        } else {
          alert(data.message);
        }
      },
      error: (error) => {
        console.error('Fehler beim Laden der Termine:', error);
        alert('Fehler beim Laden der Termine.');
      },
    });
  }


  stripTimeFromDate(date: Date): string {
    const userTimeZoneOffset = date.getTimezoneOffset() * 60000;
    const normalizedDate = new Date(date.getTime() - userTimeZoneOffset);
    return normalizedDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
  }

  onSubmit(): void {
    if (this.form.valid) {
      const dateControl = this.form.get('date')?.value;
      const normalizedDate = dateControl ? this.stripTimeFromDate(dateControl) : '';

      const formData = {
        name: this.form.value.name,
        email: this.form.value.email,
        topic: this.form.value.topic,
        message: this.form.value.message,
        time: this.form.value.time,
        date: normalizedDate,
      };

      if (this.existingAppointments.includes(formData.time)) {
        alert('Diese Uhrzeit ist bereits belegt. Bitte wählen Sie eine andere Uhrzeit.');
        return;
      }


      // Speichern des Termins in der Datenbank
      this.terminservice.api(formData).subscribe({
        next: (data) => {
          if (data.success) {
            // E-Mail senden
            this.terminservice.sendEmail(formData).subscribe({
              next: (emailData) => {
                if (emailData.success) {
                  alert('Termin wurde erfolgreich übermittelt.'); // Erfolgsnachricht
                  this.dialogRef.close(); // Dialog schließen
                } else {
                  alert(emailData.message); // Fehlermeldung anzeigen
                }
              },
              error: (error) => {
                console.error('Fehler beim Senden der E-Mail:', error);
                alert('Fehler beim Versenden der E-Mail.');
              }
            });
          } else {
            alert(data.message); // Fehlermeldung anzeigen
          }
        },
        error: (error) => {
          console.error('Fehler beim Speichern des Termins:', error);
          alert(`Fehler: ${error.status} - ${error.message}`);
        },
      });
    } else {
      alert('Bitte füllen Sie alle erforderlichen Felder aus.');
    }
  }

  // Getter für die Deaktivierung des Submit-Buttons
  get isSubmitDisabled(): boolean {
    return this.form.invalid || this.isAppointmentTaken; // Deaktiviert, wenn das Formular ungültig ist oder der Termin belegt ist
  }

  // Validierung für den erlaubten Zeitbereich
  timeValidator(control: AbstractControl): ValidationErrors | null {
    const selectedTime = control.value;
    if (!selectedTime || !this.selectedDate) return null;

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const selectedDateTime = new Date(this.selectedDate);
    selectedDateTime.setHours(hours, minutes, 0, 0);

    // Zeitbereiche festlegen (z.B. Montag - Freitag: 9:30 - 18:00 Uhr, Samstag: 10:30 - 15:30 Uhr)
    const dayOfWeek = selectedDateTime.getDay();

    // Wochentagsbereich
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const startTime = new Date(selectedDateTime);
      startTime.setHours(10, 0, 0, 0);
      const endTime = new Date(selectedDateTime);
      endTime.setHours(18, 0, 0, 0);

      if (selectedDateTime < startTime || selectedDateTime > endTime) {
        return { invalidTime: 'Die Uhrzeit muss zwischen 9:30 und 18:00 Uhr liegen.' };
      }
    }

    // Samstagbereich
    if (dayOfWeek === 6) {
      const startTime = new Date(selectedDateTime);
      startTime.setHours(10, 30, 0, 0);
      const endTime = new Date(selectedDateTime);
      endTime.setHours(15, 30, 0, 0);

      if (selectedDateTime < startTime || selectedDateTime > endTime) {
        return { invalidTime: 'Die Uhrzeit muss zwischen 10:30 und 15:30 Uhr liegen.' };
      }
    }

    // Sonntags keine Termine
    if (dayOfWeek === 0) {
      return { invalidTime: 'Sonntags sind keine Termine möglich.' };
    }

    return null;
  }
  isWithinBusinessHours(selectedDate: Date, selectedTime: string): boolean {
    const openingHours = {
      weekdays: { start: 10.0, end: 18.0 }, // 09:30 - 18:00 Uhr
      saturday: { start: 10.5, end: 15.5 }, // 10:30 - 15:30 Uhr
    };

    const selectedHour = new Date(`${selectedDate.toISOString().split('T')[0]}T${selectedTime}:00`).getHours() +
      new Date(`${selectedDate.toISOString().split('T')[0]}T${selectedTime}:00`).getMinutes() / 60;

    const dayOfWeek = selectedDate.getDay(); // 0 = Sonntag, 1 = Montag, ..., 6 = Samstag

    if (dayOfWeek === 0) {
      // Sonntag
      return false;
    } else if (dayOfWeek === 6) {
      // Samstag
      return selectedHour >= openingHours.saturday.start && selectedHour < openingHours.saturday.end;
    } else {
      // Montag - Freitag
      return selectedHour >= openingHours.weekdays.start && selectedHour < openingHours.weekdays.end;
    }
  }


}
