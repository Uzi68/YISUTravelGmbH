import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-time-slot-unblocking-dialog',
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
    <div class="time-slot-unblocking-dialog">
      <div class="dialog-header">
        <div class="header-content">
          <mat-icon>lock_open</mat-icon>
          <div>
            <h2>Zeit-Slots freigeben</h2>
            <p>{{selectedDate.toLocaleDateString('de-DE')}}</p>
          </div>
        </div>
      </div>
      
      <div class="dialog-content">
        <div class="info-section">
          <mat-icon>info</mat-icon>
          <p>Wählen Sie die Zeit-Slots aus, die Sie freigeben möchten:</p>
        </div>
        
        <!-- Time Slots Grid -->
        <div class="time-slots-section">
          <h3>Blockierte Zeit-Slots ({{blockedSlots.length}} gefunden)</h3>
          <div class="time-slots-grid" *ngIf="blockedSlots.length > 0">
            <div class="slot-item" *ngFor="let slot of blockedSlots; trackBy: trackBySlot">
              <mat-checkbox 
                [(ngModel)]="selectedSlots[slot.id.toString()]"
                (change)="onSlotChange(slot, $event.checked)"
                class="slot-checkbox">
                <div class="slot-content">
                  <div class="slot-time">{{getSlotTime(slot)}} Uhr</div>
                  <div class="blocked-indicator">
                    <mat-icon>block</mat-icon>
                    Ausgebucht
                  </div>
                </div>
              </mat-checkbox>
            </div>
          </div>
          <div *ngIf="blockedSlots.length === 0" class="no-slots-message">
            <mat-icon>info</mat-icon>
            <p>Keine blockierten Slots für diesen Tag gefunden.</p>
          </div>
        </div>
        
        <!-- Summary -->
        <div class="summary-section" *ngIf="getSelectedSlotsCount() > 0">
          <mat-icon>check_circle</mat-icon>
          <span>{{getSelectedSlotsCount()}} Zeit-Slot(s) werden freigegeben</span>
        </div>
      </div>
      
      <div mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="onCancel()">
          <mat-icon>close</mat-icon>
          Abbrechen
        </button>
        <button mat-raised-button color="accent" (click)="onConfirm()" [disabled]="getSelectedSlotsCount() === 0">
          <mat-icon>lock_open</mat-icon>
          {{getSelectedSlotsCount()}} Slot(s) freigeben
        </button>
      </div>
    </div>
  `,
  styles: [`
    .time-slot-unblocking-dialog {
      max-width: 700px;
      width: 100%;
    }

    .dialog-header {
      background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
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

    .header-content mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .header-content h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }

    .header-content p {
      margin: 4px 0 0 0;
      opacity: 0.9;
      font-size: 14px;
    }

    .dialog-content {
      padding: 0 0 16px 0;
      max-height: 60vh;
      overflow-y: auto;
    }

    .info-section {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
      padding: 16px;
      background-color: #e8f5e8;
      border-radius: 8px;
      border-left: 4px solid #4caf50;
    }

    .info-section mat-icon {
      color: #4caf50;
    }

    .info-section p {
      margin: 0;
      color: #2e7d32;
      font-weight: 500;
    }

    .time-slots-section h3 {
      margin: 0 0 16px 0;
      color: #333;
      font-size: 16px;
    }

    .time-slots-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }

    .slot-item {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 12px;
      background-color: #fafafa;
    }

    .slot-checkbox {
      width: 100%;
    }

    .slot-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .slot-time {
      font-size: 16px;
      font-weight: 500;
      color: #333;
    }

    .blocked-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      opacity: 0.7;
    }

    .blocked-indicator mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .summary-section {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background-color: #e3f2fd;
      border-radius: 8px;
      border-left: 4px solid #2196f3;
      margin-top: 16px;
    }

    .summary-section mat-icon {
      color: #2196f3;
    }

    .summary-section span {
      color: #1976d2;
      font-weight: 500;
    }

    .no-slots-message {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px;
      background-color: #fff3cd;
      border-radius: 8px;
      border-left: 4px solid #ffc107;
      margin-top: 16px;
    }

    .no-slots-message mat-icon {
      color: #ffc107;
    }

    .no-slots-message p {
      margin: 0;
      color: #856404;
      font-weight: 500;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
      flex-wrap: wrap;
    }

    .dialog-actions button {
      min-width: 120px;
      height: 44px;
      font-size: 14px;
      font-weight: 500;
      border-radius: 6px;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .dialog-actions button:hover {
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
    }

    .dialog-actions button mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .time-slot-unblocking-dialog {
        max-width: 95vw;
      }
      
      .dialog-header {
        padding: 16px;
      }
      
      .header-content {
        flex-direction: column;
        text-align: center;
        gap: 8px;
      }
      
      .header-content h2 {
        font-size: 18px;
      }
      
      .time-slots-grid {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 8px;
      }
      
      .slot-item {
        padding: 8px;
      }
      
      .dialog-actions {
        flex-direction: column;
        gap: 8px;
      }
      
      .dialog-actions button {
        width: 100%;
        min-width: unset;
        height: 40px;
        font-size: 13px;
      }
    }

    @media (max-width: 480px) {
      .time-slots-grid {
        grid-template-columns: 1fr;
      }
      
      .info-section {
        flex-direction: column;
        text-align: center;
        gap: 8px;
      }
    }
  `]
})
export class TimeSlotUnblockingDialog {
  selectedDate: Date;
  blockedSlots: Array<{id: number, time: string, reason: string}> = [];
  selectedSlots: { [key: string]: boolean } = {};

  constructor(
    public dialogRef: MatDialogRef<TimeSlotUnblockingDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.selectedDate = data.date;
    // Store the full slot objects
    this.blockedSlots = data.blockedSlots || [];
    
    // Initialize selected slots using slot IDs as keys
    this.blockedSlots.forEach(slot => {
      this.selectedSlots[slot.id.toString()] = false;
    });
  }

  getSelectedSlotsCount(): number {
    return Object.values(this.selectedSlots).filter(selected => selected).length;
  }

  onSlotChange(slot: {id: number, time: string, reason: string}, checked: boolean): void {
    // Use the slot ID as the key
    this.selectedSlots[slot.id.toString()] = checked;
  }

  trackBySlot(index: number, slot: {id: number, time: string, reason: string}): string {
    // Use the slot ID for tracking
    return slot.id.toString();
  }

  getSlotTime(slot: {id: number, time: string, reason: string}): string {
    return slot.time;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    const slotsToUnblock: string[] = [];
    
    // Iterate through blockedSlots and check if they're selected
    this.blockedSlots.forEach(slot => {
      if (this.selectedSlots[slot.id.toString()]) {
        slotsToUnblock.push(slot.time);
      }
    });
    
    if (slotsToUnblock.length === 0) {
      return;
    }

    // Directly unblock without confirmation dialog
    this.dialogRef.close({
      action: 'unblockTimeSlots',
      date: this.selectedDate,
      slots: slotsToUnblock
    });
  }
}
