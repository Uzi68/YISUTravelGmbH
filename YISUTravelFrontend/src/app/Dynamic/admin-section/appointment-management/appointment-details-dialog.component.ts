import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Appointment } from '../../../Models/Appointment';
import { TimeSlotBlockingDialog } from './time-slot-blocking-dialog.component';
import { TimeSlotUnblockingDialog } from './time-slot-unblocking-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AppointmentService } from '../../../Services/appointment-service/appointment.service';

@Component({
  selector: 'app-appointment-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="appointment-details-dialog">
      <div mat-dialog-title class="dialog-header">
        <mat-icon>event</mat-icon>
        <h2>{{isDateView ? 'Termine für ' + getFormattedDate(selectedDate!) : 'Termin Details'}}</h2>
      </div>
      
      <div mat-dialog-content class="dialog-content">
        <!-- Multiple appointments for a date -->
        <div *ngIf="isDateView && appointments.length > 0" class="appointments-list">
          <div class="date-header">
            <h3>{{getFormattedDate(selectedDate!)}}</h3>
            <p class="appointments-count">{{appointments.length}} Termin(e) gefunden</p>
            
            <!-- Blocking Actions -->
            <div class="block-actions">
              <button mat-raised-button color="warn" (click)="onBlockDay()">
                <mat-icon>block</mat-icon>
                Ganzen Tag blockieren
              </button>
              <button mat-raised-button color="primary" (click)="onBlockTimeSlots()">
                <mat-icon>schedule</mat-icon>
                Zeit-Slots blockieren
              </button>
              <button mat-raised-button color="accent" (click)="onUnblockTimeSlots()">
                <mat-icon>lock_open</mat-icon>
                Zeit-Slots freigeben
              </button>
            </div>
          </div>
          
          <div *ngFor="let appointment of appointments; let i = index" class="appointment-item">
            <div class="appointment-header">
              <div class="time-badge">
                <mat-icon>schedule</mat-icon>
                <span>{{appointment.appointment_time}} Uhr</span>
              </div>
              <span class="status-badge" [class]="'status-' + appointment.status">
                {{getStatusLabel(appointment.status)}}
              </span>
            </div>
            
            <div class="appointment-details">
              <div class="customer-info">
                <div class="info-row">
                  <mat-icon>person</mat-icon>
                  <span>{{appointment.customer_name}}</span>
                </div>
                <div class="info-row">
                  <mat-icon>email</mat-icon>
                  <a [href]="'mailto:' + appointment.customer_email">{{appointment.customer_email}}</a>
                </div>
                <div class="info-row">
                  <mat-icon>phone</mat-icon>
                  <a [href]="'tel:' + appointment.customer_phone">{{appointment.customer_phone}}</a>
                </div>
              </div>
              
              <div class="service-info">
                <mat-icon>business</mat-icon>
                <span>{{getServiceTypeLabel(appointment.service_type)}}</span>
              </div>
              
              <div class="message-info" *ngIf="appointment.message">
                <mat-icon>message</mat-icon>
                <div class="message-text">{{appointment.message}}</div>
              </div>
              
              <!-- Appointment Actions -->
              <div class="appointment-actions">
                <button mat-raised-button 
                        color="warn" 
                        (click)="onReleaseAppointment(appointment)"
                        *ngIf="appointment.status !== 'cancelled'"
                        class="action-button">
                  <mat-icon>cancel</mat-icon>
                  Termin freigeben
                </button>
                <button mat-raised-button 
                        color="accent" 
                        (click)="onRestoreAppointment(appointment)"
                        *ngIf="appointment.status === 'cancelled'"
                        class="action-button">
                  <mat-icon>restore</mat-icon>
                  Termin wiederherstellen
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Single appointment details -->
        <div *ngIf="!isDateView && singleAppointment" class="single-appointment">
          <div class="details-section">
            <h3>Kundeninformationen</h3>
            <div class="detail-row">
              <mat-icon>person</mat-icon>
              <div class="detail-info">
                <strong>Name:</strong> {{singleAppointment.customer_name}}
              </div>
            </div>
            <div class="detail-row">
              <mat-icon>email</mat-icon>
              <div class="detail-info">
                <strong>E-Mail:</strong> 
                <a [href]="'mailto:' + singleAppointment.customer_email">{{singleAppointment.customer_email}}</a>
              </div>
            </div>
            <div class="detail-row">
              <mat-icon>phone</mat-icon>
              <div class="detail-info">
                <strong>Telefon:</strong> 
                <a [href]="'tel:' + singleAppointment.customer_phone">{{singleAppointment.customer_phone}}</a>
              </div>
            </div>
          </div>

          <div class="details-section">
            <h3>Termininformationen</h3>
            <div class="detail-row">
              <mat-icon>calendar_today</mat-icon>
              <div class="detail-info">
                <strong>Datum:</strong> {{getFormattedDate(singleAppointment.appointment_date)}}
              </div>
            </div>
            <div class="detail-row">
              <mat-icon>schedule</mat-icon>
              <div class="detail-info">
                <strong>Uhrzeit:</strong> {{singleAppointment.appointment_time}} Uhr
              </div>
            </div>
            <div class="detail-row">
              <mat-icon>business</mat-icon>
              <div class="detail-info">
                <strong>Service:</strong> {{getServiceTypeLabel(singleAppointment.service_type)}}
              </div>
            </div>
            <div class="detail-row">
              <mat-icon>info</mat-icon>
              <div class="detail-info">
                <strong>Status:</strong> 
                <span class="status-badge" [class]="'status-' + singleAppointment.status">
                  {{getStatusLabel(singleAppointment.status)}}
                </span>
              </div>
            </div>
          </div>

          <div class="details-section" *ngIf="singleAppointment.message">
            <h3>Nachricht</h3>
            <div class="message-content">
              {{singleAppointment.message}}
            </div>
          </div>

          <div class="details-section">
            <h3>Systeminformationen</h3>
            <div class="detail-row">
              <mat-icon>schedule</mat-icon>
              <div class="detail-info">
                <strong>Erstellt:</strong> {{getFormattedDateTime(singleAppointment.created_at)}}
              </div>
            </div>
            <div class="detail-row" *ngIf="singleAppointment.updated_at !== singleAppointment.created_at">
              <mat-icon>update</mat-icon>
              <div class="detail-info">
                <strong>Zuletzt aktualisiert:</strong> {{getFormattedDateTime(singleAppointment.updated_at)}}
              </div>
            </div>
          </div>
        </div>

        <!-- No appointments message -->
        <div *ngIf="isDateView && appointments.length === 0" class="no-appointments">
          <div class="no-appointments-content">
            <mat-icon>event_available</mat-icon>
            <h3>Keine Termine für {{getFormattedDate(selectedDate!)}}</h3>
            <p>Dieser Tag ist noch frei für Terminbuchungen.</p>
            
            <div class="block-actions">
              <button mat-raised-button color="warn" (click)="onBlockDay()">
                <mat-icon>block</mat-icon>
                Ganzen Tag blockieren
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="onClose()">
          <mat-icon>close</mat-icon>
          Schließen
        </button>
        <button mat-raised-button color="primary" (click)="onEdit()" *ngIf="!isDateView">
          <mat-icon>edit</mat-icon>
          Bearbeiten
        </button>
      </div>
    </div>
  `,
  styles: [`
    .appointment-details-dialog {
      max-width: 600px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e0e0e0;
    }

    .dialog-header mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #1976d2;
    }

    .dialog-header h2 {
      margin: 0;
      color: #333;
      font-size: 24px;
      font-weight: 600;
    }

    .dialog-content {
      max-height: 70vh;
      overflow-y: auto;
    }

    .details-section {
      margin-bottom: 24px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #2196f3;
    }

    .details-section h3 {
      margin: 0 0 16px 0;
      color: #333;
      font-size: 18px;
      font-weight: 600;
    }

    .detail-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }

    .detail-row mat-icon {
      color: #666;
      margin-top: 2px;
    }

    .detail-info {
      flex: 1;
    }

    .detail-info strong {
      color: #333;
      font-weight: 600;
    }

    .detail-info a {
      color: #2196f3;
      text-decoration: none;
    }

    .detail-info a:hover {
      text-decoration: underline;
    }

    .message-content {
      background: white;
      padding: 12px;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
      white-space: pre-wrap;
      font-family: inherit;
    }

    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-confirmed {
      background: #e8f5e8;
      color: #2e7d32;
    }

    .status-cancelled {
      background: #ffebee;
      color: #c62828;
    }

    .status-completed {
      background: #e3f2fd;
      color: #1565c0;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .appointments-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .appointment-item {
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
    }

    .appointment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f0f0f0;
    }

    .appointment-header h4 {
      margin: 0;
      color: #333;
      font-size: 16px;
      font-weight: 600;
    }

    .appointment-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .no-appointments {
      text-align: center;
      padding: 40px;
      color: #666;
    }

    .no-appointments mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      color: #ccc;
    }

    .date-header {
      text-align: center;
      margin-bottom: 20px;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
    }

    .date-header h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
    }

    .appointments-count {
      margin: 0;
      opacity: 0.9;
      font-size: 14px;
    }

    .time-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #e3f2fd;
      color: #1976d2;
      padding: 8px 12px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
    }

    .customer-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
    }

    .info-row mat-icon {
      color: #666;
      font-size: 18px;
      width: 18px;
    }

    .info-row a {
      color: #1976d2;
      text-decoration: none;
    }

    .info-row a:hover {
      text-decoration: underline;
    }

    .service-info {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f3e5f5;
      color: #7b1fa2;
      padding: 6px 10px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
      align-self: flex-start;
    }

    .message-info {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-top: 8px;
    }

    .message-text {
      background: #f8f9fa;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.4;
      border-left: 3px solid #1976d2;
    }

    .no-appointments-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    .no-appointments h3 {
      margin: 0;
      color: #333;
      font-size: 20px;
      font-weight: 600;
    }

    .no-appointments p {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    .block-actions {
      display: flex;
      gap: 12px;
      margin-top: 20px;
      flex-wrap: wrap;
    }

    .block-actions button {
      flex: 1;
      min-width: 180px;
      height: 48px;
      font-size: 14px;
      font-weight: 500;
      border-radius: 8px;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .block-actions button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .block-actions button mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .appointment-actions {
      display: flex;
      gap: 12px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
      flex-wrap: wrap;
    }

    .action-button {
      flex: 1;
      min-width: 140px;
      height: 44px;
      font-size: 13px;
      font-weight: 500;
      border-radius: 6px;
      transition: all 0.3s ease;
    }

    .action-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .appointment-details-dialog {
        max-width: 95vw;
      }
      
      .dialog-header {
        flex-direction: column;
        text-align: center;
        gap: 8px;
      }
      
      .dialog-header h2 {
        font-size: 20px;
      }
      
      .block-actions {
        flex-direction: column;
        gap: 8px;
      }
      
      .block-actions button {
        width: 100%;
        min-width: unset;
        height: 44px;
        font-size: 13px;
      }
      
      .appointment-item {
        padding: 12px;
      }
      
      .appointment-header {
        flex-direction: column;
        gap: 8px;
        align-items: flex-start;
      }
      
      .customer-info {
        gap: 6px;
      }
      
      .info-row {
        font-size: 13px;
      }
      
      .dialog-actions {
        flex-direction: column;
        gap: 8px;
      }
      
      .dialog-actions button {
        width: 100%;
      }
    }

    @media (max-width: 480px) {
      .dialog-header h2 {
        font-size: 18px;
      }
      
      .appointment-item {
        padding: 8px;
      }
      
      .time-badge {
        font-size: 12px;
      }
      
      .status-badge {
        font-size: 10px;
        padding: 2px 6px;
      }
      
      .service-info {
        font-size: 11px;
        padding: 4px 8px;
      }
      
      .message-text {
        font-size: 12px;
        padding: 6px 10px;
      }
    }
  `]
})
export class AppointmentDetailsDialog {
  appointments: Appointment[] = [];
  singleAppointment: Appointment | null = null;
  isDateView: boolean = false;
  selectedDate: Date | null = null;

  constructor(
    public dialogRef: MatDialogRef<AppointmentDetailsDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private appointmentService: AppointmentService
  ) {
    // Handle both single appointment and multiple appointments for a date
    if (data.appointments && data.isDateView) {
      this.appointments = data.appointments;
      this.isDateView = true;
      this.selectedDate = data.date;
    } else {
      this.singleAppointment = data;
      this.isDateView = false;
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }

  onEdit(): void {
    // For now, just close the dialog
    // In the future, this could open an edit dialog
    this.dialogRef.close('edit');
  }

  onBlockDay(): void {
    if (!this.selectedDate) return;
    
    // Check if there are any appointments for this date
    if (this.appointments.length > 0) {
      this.snackBar.open('Dieser Tag kann nicht blockiert werden, da bereits Termine gebucht sind.', 'OK', {
        duration: 5000
      });
      return;
    }
    
    // Create date string without timezone issues
    const year = this.selectedDate.getFullYear();
    const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(this.selectedDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    const message = `Möchten Sie den gesamten Tag ${this.selectedDate.toLocaleDateString('de-DE')} blockieren?`;
    
    if (confirm(message)) {
      this.blockAllTimeSlotsForDay(dateString);
    }
  }

  onBlockTimeSlots(): void {
    if (!this.selectedDate) return;
    
    // Create date string without timezone issues
    const year = this.selectedDate.getFullYear();
    const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(this.selectedDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    this.openTimeSlotBlockingDialog(dateString);
  }

  onUnblockTimeSlots(): void {
    if (!this.selectedDate) {
      return;
    }
    
    // Create date string without timezone issues
    const year = this.selectedDate.getFullYear();
    const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(this.selectedDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    this.openTimeSlotUnblockingDialog(dateString);
  }

  private blockAllTimeSlotsForDay(dateString: string): void {
    const slots = this.generateTimeSlotsForDay(this.selectedDate!);
    
    let blockedCount = 0;
    slots.forEach(slot => {
      this.appointmentService.blockSlot(dateString, slot).subscribe({
        next: (response) => {
          blockedCount++;
          if (blockedCount === slots.length) {
            this.snackBar.open(`Ganzer Tag ${dateString} erfolgreich blockiert`, 'OK', {
              duration: 3000
            });
            this.dialogRef.close({ action: 'refresh' });
          }
        },
        error: (error) => {
          console.error('Error blocking slot:', slot, error);
          this.snackBar.open('Fehler beim Blockieren des Tages', 'OK', {
            duration: 3000
          });
        }
      });
    });
  }

  private openTimeSlotUnblockingDialog(dateString: string): void {
    const date = new Date(dateString);
    
    this.appointmentService.getBlockedSlots(dateString).subscribe({
      next: (response: any) => {
        const blockedSlots = response.blocked_slots || [];
        
        if (blockedSlots.length === 0) {
          this.snackBar.open('Keine blockierten Slots für diesen Tag gefunden', 'OK', {
            duration: 3000
          });
          return;
        }
        
        const dialogRef = this.dialog.open(TimeSlotUnblockingDialog, {
          width: '700px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          data: {
            date: date,
            blockedSlots: blockedSlots
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result && result.action === 'unblockTimeSlots') {
            this.handleUnblockTimeSlots(result.date, result.slots);
          }
        });
      },
      error: (error) => {
        console.error('Error loading blocked slots:', error);
        this.snackBar.open('Fehler beim Laden der blockierten Slots', 'OK', {
          duration: 3000
        });
      }
    });
  }

  private openTimeSlotBlockingDialog(dateString: string): void {
    const date = new Date(dateString);
    
    this.appointmentService.getBlockedSlots(dateString).subscribe({
      next: (response: any) => {
        const blockedSlots = response.blocked_slots || [];
        
        // Also get booked appointments for this date
        this.appointmentService.getAvailableSlots(dateString).subscribe({
          next: (slotsResponse: any) => {
            // Get all possible slots for this date
            const allSlots = this.generateTimeSlotsForDay(date);
            const availableSlots = slotsResponse.available_slots || [];
            
            // Find booked slots (all slots minus available slots)
            const bookedSlots = allSlots.filter(slot => !availableSlots.includes(slot));
            
            // Combine blocked and booked slots
            const unavailableSlots = [...blockedSlots, ...bookedSlots];
            
            const dialogRef = this.dialog.open(TimeSlotBlockingDialog, {
              width: '700px',
              data: {
                date: date,
                blockedSlots: unavailableSlots,
                appointments: this.appointments
              }
            });

            dialogRef.afterClosed().subscribe(result => {
              if (result && result.action === 'blockTimeSlots') {
                this.handleBlockTimeSlots(result.date, result.slots);
              } else if (result && result.action === 'unblockTimeSlots') {
                this.handleUnblockTimeSlots(result.date, result.slots);
              }
            });
          },
          error: (error) => {
            console.error('Error loading available slots:', error);
            // Fallback to just blocked slots
            const dialogRef = this.dialog.open(TimeSlotBlockingDialog, {
              width: '700px',
              data: {
                date: date,
                blockedSlots: blockedSlots,
                appointments: this.appointments
              }
            });

            dialogRef.afterClosed().subscribe(result => {
              if (result && result.action === 'blockTimeSlots') {
                this.handleBlockTimeSlots(result.date, result.slots);
              } else if (result && result.action === 'unblockTimeSlots') {
                this.handleUnblockTimeSlots(result.date, result.slots);
              }
            });
          }
        });
      },
      error: (error) => {
        console.error('Error loading blocked slots:', error);
        // Open dialog with empty blocked slots
        const dialogRef = this.dialog.open(TimeSlotBlockingDialog, {
          width: '700px',
          data: {
            date: date,
            blockedSlots: [],
            appointments: this.appointments
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result && result.action === 'blockTimeSlots') {
            this.handleBlockTimeSlots(result.date, result.slots);
          }
        });
      }
    });
  }

  private handleBlockTimeSlots(date: Date, slots: string[]): void {
    // Create date string without timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    let blockedCount = 0;
    slots.forEach(slot => {
      this.appointmentService.blockSlot(dateString, slot).subscribe({
        next: () => {
          blockedCount++;
          if (blockedCount === slots.length) {
            this.snackBar.open(`${slots.length} Zeit-Slot(s) erfolgreich blockiert`, 'OK', {
              duration: 3000
            });
            this.dialogRef.close({ action: 'refresh' });
          }
        },
        error: (error) => {
          console.error('Error blocking slot:', error);
          this.snackBar.open('Fehler beim Blockieren der Zeit-Slots', 'OK', {
            duration: 3000
          });
        }
      });
    });
  }

  private handleUnblockTimeSlots(date: Date, slots: string[]): void {
    // Create date string without timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    console.log('handleUnblockTimeSlots called with:', { dateString, slots });

    // Unblock multiple slots
    this.appointmentService.unblockMultipleSlots(dateString, slots).subscribe({
      next: (response) => {
        this.snackBar.open(response.message, 'OK', {
          duration: 3000
        });
        this.dialogRef.close({ action: 'refresh' });
      },
      error: (error) => {
        console.error('Error unblocking slots:', error);
        this.snackBar.open('Fehler beim Freigeben der Slots', 'OK', {
          duration: 3000
        });
      }
    });
  }

  private generateTimeSlotsForDay(date: Date): string[] {
    const slots: string[] = [];
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 0) return []; // Sunday - closed

    const isSaturday = dayOfWeek === 6;
    const startTime = isSaturday ? '10:30' : '10:00';
    const endTime = isSaturday ? '15:00' : '17:30';

    let [currentHour, currentMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
      slots.push(timeString);

      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour++;
      }
    }
    return slots;
  }

  getFormattedDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getFormattedDateTime(dateString: string | undefined): string {
    if (!dateString) return 'Nicht verfügbar';
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getServiceTypeLabel(serviceType: string): string {
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

  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      'pending': 'Ausstehend',
      'confirmed': 'Bestätigt',
      'cancelled': 'Storniert',
      'completed': 'Abgeschlossen'
    };
    return statusLabels[status] || status;
  }

  /**
   * Release a booked appointment (admin can free up slots when customers cancel)
   */
  onReleaseAppointment(appointment: Appointment): void {
    const message = `Möchten Sie den Termin von ${appointment.customer_name} am ${this.getFormattedDate(appointment.appointment_date)} um ${appointment.appointment_time} Uhr freigeben?\n\nDies macht den Zeit-Slot wieder verfügbar für neue Buchungen.`;
    
    if (confirm(message)) {
      this.appointmentService.releaseAppointment(appointment.id!).subscribe({
        next: (response) => {
          this.snackBar.open(response.message, 'OK', {
            duration: 3000
          });
          this.dialogRef.close({ action: 'refresh' });
        },
        error: (error) => {
          console.error('Error releasing appointment:', error);
          this.snackBar.open('Fehler beim Freigeben des Termins', 'OK', {
            duration: 3000
          });
        }
      });
    }
  }

  /**
   * Restore a cancelled appointment (admin can restore if customer rebooks)
   */
  onRestoreAppointment(appointment: Appointment): void {
    const message = `Möchten Sie den stornierten Termin von ${appointment.customer_name} am ${this.getFormattedDate(appointment.appointment_date)} um ${appointment.appointment_time} Uhr wiederherstellen?\n\nDies macht den Termin wieder aktiv.`;
    
    if (confirm(message)) {
      this.appointmentService.restoreAppointment(appointment.id!).subscribe({
        next: (response) => {
          this.snackBar.open(response.message, 'OK', {
            duration: 3000
          });
          this.dialogRef.close({ action: 'refresh' });
        },
        error: (error) => {
          console.error('Error restoring appointment:', error);
          this.snackBar.open('Fehler beim Wiederherstellen des Termins', 'OK', {
            duration: 3000
          });
        }
      });
    }
  }
}
