import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-time-slot-blocking-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    FormsModule
  ],
  template: `
    <div class="time-slot-blocking-dialog">
      <div mat-dialog-title class="dialog-header">
        <div class="header-content">
          <div class="header-icon">
            <mat-icon>schedule</mat-icon>
          </div>
          <div class="header-text">
            <h2>Zeit-Slots blockieren</h2>
            <p>{{getFormattedDate(selectedDate)}}</p>
          </div>
        </div>
      </div>
      
      <div mat-dialog-content class="dialog-content">
        <div class="info-section">
          <mat-icon>info</mat-icon>
          <p>Wählen Sie die Zeit-Slots aus, die Sie blockieren möchten:</p>
        </div>
        
        <!-- Quick Actions -->
        <div class="quick-actions">
          <h3>Quick Actions</h3>
          <div class="quick-buttons">
            <button mat-raised-button 
                    [color]="blockAllDay ? 'warn' : 'primary'"
                    (click)="onBlockAllDayChange()"
                    class="quick-btn"
                    [disabled]="hasBookedAppointments()">
              <mat-icon>block</mat-icon>
              Ganzen Tag
              <span *ngIf="hasBookedAppointments()" class="disabled-hint">(Nicht möglich - Termine vorhanden)</span>
            </button>
            
            <button mat-raised-button 
                    [color]="blockMorning ? 'warn' : 'primary'"
                    (click)="onBlockMorningChange()"
                    class="quick-btn">
              <mat-icon>wb_sunny</mat-icon>
              Vormittag
            </button>
            
            <button mat-raised-button 
                    [color]="blockAfternoon ? 'warn' : 'primary'"
                    (click)="onBlockAfternoonChange()"
                    class="quick-btn">
              <mat-icon>wb_sunny</mat-icon>
              Nachmittag
            </button>
          </div>
        </div>
        
        <!-- Time Slots Grid -->
        <div class="time-slots-section">
          <h3>Einzelne Zeit-Slots</h3>
          <div class="time-slots-grid">
            <div *ngFor="let slot of availableTimeSlots" class="time-slot-item">
              <mat-checkbox 
                [(ngModel)]="selectedSlots[slot]"
                [disabled]="isSlotBlocked(slot)"
                class="slot-checkbox">
                <div class="slot-content">
                  <div class="slot-time">{{slot}} Uhr</div>
                  <div *ngIf="isSlotBlocked(slot)" class="blocked-indicator">
                    <mat-icon>block</mat-icon>
                    Ausgebucht
                  </div>
                </div>
              </mat-checkbox>
            </div>
          </div>
        </div>
        
        <!-- Summary -->
        <div class="summary-section" *ngIf="getSelectedSlotsCount() > 0">
          <mat-icon>check_circle</mat-icon>
          <span>{{getSelectedSlotsCount()}} Zeit-Slot(s) werden blockiert</span>
        </div>
      </div>
      
      <div mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="onCancel()">
          <mat-icon>close</mat-icon>
          Abbrechen
        </button>
        <button mat-raised-button color="accent" (click)="onUnblockSelected()" [disabled]="getSelectedBlockedSlotsCount() === 0">
          <mat-icon>lock_open</mat-icon>
          {{getSelectedBlockedSlotsCount()}} Slot(s) freigeben
        </button>
        <button mat-raised-button color="primary" (click)="onConfirm()" [disabled]="getSelectedSlotsCount() === 0">
          <mat-icon>block</mat-icon>
          {{getSelectedSlotsCount()}} Slot(s) blockieren
        </button>
      </div>
    </div>
  `,
  styles: [`
    .time-slot-blocking-dialog {
      max-width: 700px;
    }

    .dialog-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      margin: -24px -24px 24px -24px;
      padding: 24px;
      border-radius: 8px 8px 0 0;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-icon {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .header-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .header-text h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }

    .header-text p {
      margin: 4px 0 0 0;
      opacity: 0.9;
      font-size: 14px;
    }

    .dialog-content {
      max-height: 70vh;
      overflow-y: auto;
    }

    .info-section {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      padding: 16px;
      background: #e3f2fd;
      border-radius: 8px;
      border-left: 4px solid #2196f3;
    }

    .info-section mat-icon {
      color: #1976d2;
    }

    .quick-actions {
      margin-bottom: 24px;
    }

    .quick-actions h3 {
      margin: 0 0 16px 0;
      color: #333;
      font-size: 16px;
      font-weight: 600;
    }

    .quick-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .quick-btn {
      flex: 1;
      min-width: 120px;
      position: relative;
    }
    
    .quick-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .disabled-hint {
      font-size: 10px;
      display: block;
      margin-top: 4px;
      color: #666;
    }

    .time-slots-section h3 {
      margin: 0 0 16px 0;
      color: #333;
      font-size: 16px;
      font-weight: 600;
    }

    .time-slots-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }

    .time-slot-item {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 12px;
      background: white;
      transition: all 0.2s ease;
    }

    .time-slot-item:hover {
      border-color: #2196f3;
      box-shadow: 0 2px 8px rgba(33, 150, 243, 0.1);
    }

    .slot-checkbox {
      width: 100%;
    }

    .slot-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .slot-time {
      font-weight: 600;
      color: #333;
      font-size: 14px;
    }

    .blocked-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #f44336;
      font-style: italic;
    }

    .blocked-indicator mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .summary-section {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: #e8f5e9;
      color: #2e7d32;
      border-radius: 8px;
      font-weight: 500;
    }

    .summary-section mat-icon {
      color: #4caf50;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }
  `]
})
export class TimeSlotBlockingDialog {
  selectedDate: Date;
  availableTimeSlots: string[] = [];
  selectedSlots: { [key: string]: boolean } = {};
  blockedSlots: string[] = [];
  appointments: any[] = [];
  
  // Blocking options
  blockAllDay = false;
  blockMorning = false;
  blockAfternoon = false;

  constructor(
    public dialogRef: MatDialogRef<TimeSlotBlockingDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.selectedDate = data.date;
    this.blockedSlots = data.blockedSlots || [];
    this.appointments = data.appointments || [];
    this.generateTimeSlots();
  }

  generateTimeSlots(): void {
    const dayOfWeek = this.selectedDate.getDay();
    
    if (dayOfWeek === 0) {
      this.availableTimeSlots = []; // Sunday - closed
      return;
    }
    
    const isSaturday = dayOfWeek === 6;
    const startTime = isSaturday ? '10:30' : '10:00';
    const endTime = isSaturday ? '15:00' : '17:30';
    
    const slots: string[] = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMin = startMin;
    
    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
      slots.push(timeString);
      
      currentMin += 30;
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour++;
      }
    }
    
    this.availableTimeSlots = slots;
  }

  isSlotBlocked(slot: string): boolean {
    return this.blockedSlots.includes(slot);
  }

  hasBookedAppointments(): boolean {
    return this.appointments.length > 0;
  }

  getSelectedSlotsCount(): number {
    return Object.values(this.selectedSlots).filter(selected => selected).length;
  }

  getSelectedBlockedSlotsCount(): number {
    return this.availableTimeSlots.filter(slot => 
      this.isSlotBlocked(slot) && this.selectedSlots[slot]
    ).length;
  }

  onUnblockSelected(): void {
    const slotsToUnblock = this.availableTimeSlots.filter(slot => 
      this.isSlotBlocked(slot) && this.selectedSlots[slot]
    );

    if (slotsToUnblock.length === 0) {
      return;
    }

    const message = `Möchten Sie ${slotsToUnblock.length} Slot(s) freigeben?`;
    if (confirm(message)) {
      this.dialogRef.close({
        action: 'unblockTimeSlots',
        date: this.selectedDate,
        slots: slotsToUnblock
      });
    }
  }

  onBlockAllDayChange(): void {
    this.blockAllDay = !this.blockAllDay;
    
    if (this.blockAllDay) {
      // Select all available slots
      this.availableTimeSlots.forEach(slot => {
        if (!this.isSlotBlocked(slot)) {
          this.selectedSlots[slot] = true;
        }
      });
      this.blockMorning = false;
      this.blockAfternoon = false;
    } else {
      // Deselect all slots
      this.availableTimeSlots.forEach(slot => {
        this.selectedSlots[slot] = false;
      });
    }
  }

  onBlockMorningChange(): void {
    this.blockMorning = !this.blockMorning;
    
    if (this.blockMorning) {
      // Select morning slots
      this.availableTimeSlots.forEach(slot => {
        if (!this.isSlotBlocked(slot) && this.isMorningSlot(slot)) {
          this.selectedSlots[slot] = true;
        }
      });
      this.blockAllDay = false;
      this.blockAfternoon = false;
    } else {
      // Deselect morning slots
      this.availableTimeSlots.forEach(slot => {
        if (this.isMorningSlot(slot)) {
          this.selectedSlots[slot] = false;
        }
      });
    }
  }

  onBlockAfternoonChange(): void {
    this.blockAfternoon = !this.blockAfternoon;
    
    if (this.blockAfternoon) {
      // Select afternoon slots
      this.availableTimeSlots.forEach(slot => {
        if (!this.isSlotBlocked(slot) && this.isAfternoonSlot(slot)) {
          this.selectedSlots[slot] = true;
        }
      });
      this.blockAllDay = false;
      this.blockMorning = false;
    } else {
      // Deselect afternoon slots
      this.availableTimeSlots.forEach(slot => {
        if (this.isAfternoonSlot(slot)) {
          this.selectedSlots[slot] = false;
        }
      });
    }
  }

  private isMorningSlot(slot: string): boolean {
    const [hour] = slot.split(':').map(Number);
    return hour >= 10 && hour < 12;
  }

  private isAfternoonSlot(slot: string): boolean {
    const [hour] = slot.split(':').map(Number);
    return hour >= 13 && hour < 18;
  }

  private updateBlockAllDay(): void {
    const totalSlots = this.availableTimeSlots.filter(slot => !this.isSlotBlocked(slot)).length;
    const selectedSlots = this.getSelectedSlotsCount();
    this.blockAllDay = selectedSlots === totalSlots;
  }

  getFormattedDate(date: Date): string {
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    const slotsToBlock = Object.keys(this.selectedSlots).filter(slot => this.selectedSlots[slot]);
    this.dialogRef.close({
      action: 'blockTimeSlots',
      date: this.selectedDate,
      slots: slotsToBlock
    });
  }
}
