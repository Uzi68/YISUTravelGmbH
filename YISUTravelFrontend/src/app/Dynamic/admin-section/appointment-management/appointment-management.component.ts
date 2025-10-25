import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppointmentService } from '../../../Services/appointment-service/appointment.service';
import { Appointment, AppointmentFilters } from '../../../Models/Appointment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, addDays, subDays } from 'date-fns';
import { AppointmentDetailsDialog } from './appointment-details-dialog.component';
import { TimeSlotBlockingDialog } from './time-slot-blocking-dialog.component';
import { AuthService } from '../../../Services/AuthService/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-appointment-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonToggleModule,
    MatTooltipModule
  ],
  templateUrl: './appointment-management.component.html',
  styleUrl: './appointment-management.component.css'
})
export class AppointmentManagementComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // View toggle
  currentView: 'calendar' | 'list' = 'calendar';

  // Data
  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];
  dataSource = new MatTableDataSource<Appointment>([]);

  // Filters
  filters: AppointmentFilters = {
    start_date: '',
    end_date: '',
    status: 'all',
    page: 1
  };

  // Calendar
  viewDate: Date = new Date();
  
  // Cache for calendar days to prevent recalculation
  private calendarDaysCache: Date[] = [];
  private lastViewDateMonth: number = -1;
  calendarEvents: any[] = [];

  // Loading states
  isLoading = false;
  isBlockingSlot = false;

  // Table columns
  displayedColumns: string[] = [
    'appointment_date',
    'appointment_time',
    'customer_name',
    'customer_phone',
    'service_type',
    'status',
    'actions'
  ];

  // Status options
  statusOptions = [
    { value: 'all', label: 'Alle' },
    { value: 'confirmed', label: 'Bestätigt' },
    { value: 'cancelled', label: 'Storniert' },
    { value: 'completed', label: 'Abgeschlossen' }
  ];

  constructor(
    private appointmentService: AppointmentService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAppointments();
    this.setupDateFilters();
  }

  /**
   * Set up default date filters (current month)
   */
  private setupDateFilters(): void {
    const startOfCurrentMonth = startOfMonth(new Date());
    const endOfCurrentMonth = endOfMonth(new Date());
    
    this.filters.start_date = format(startOfCurrentMonth, 'yyyy-MM-dd');
    this.filters.end_date = format(endOfCurrentMonth, 'yyyy-MM-dd');
  }

  /**
   * Load appointments from API
   */
  loadAppointments(): void {
    this.isLoading = true;
    
    this.appointmentService.getAllAppointments(this.filters).subscribe({
      next: (response: any) => {
        this.appointments = response.data || response;
        this.filteredAppointments = [...this.appointments];
        this.dataSource.data = this.filteredAppointments;
        this.updateCalendarEvents();
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading appointments:', error);
        
        // Check if it's an authentication error
        if (error.status === 401) {
          this.snackBar.open('Sie sind nicht authentifiziert. Bitte loggen Sie sich erneut ein.', 'Schließen', {
            duration: 5000
          });
          // Optionally redirect to login
          // this.router.navigate(['/admin-login']);
        } else {
          this.snackBar.open('Fehler beim Laden der Termine', 'Schließen', {
            duration: 3000
          });
        }
        this.isLoading = false;
      }
    });
  }

  /**
   * Update calendar events from appointments
   */
  private updateCalendarEvents(): void {
    this.calendarEvents = this.appointments.map(appointment => ({
      id: appointment.id,
      title: `${appointment.appointment_time} - ${appointment.customer_name}`,
      start: new Date(`${appointment.appointment_date}T${appointment.appointment_time}`),
      color: this.getStatusColor(appointment.status),
      meta: appointment
    }));
  }

  /**
   * Get color for appointment status
   */
  private getStatusColor(status: string): any {
    switch (status) {
      case 'confirmed': return { primary: '#4caf50', secondary: '#c8e6c9' };
      case 'cancelled': return { primary: '#f44336', secondary: '#ffcdd2' };
      case 'completed': return { primary: '#2196f3', secondary: '#bbdefb' };
      default: return { primary: '#9e9e9e', secondary: '#f5f5f5' };
    }
  }

  /**
   * Toggle between calendar and list view
   */
  toggleView(view: 'calendar' | 'list'): void {
    this.currentView = view;
  }

  /**
   * Apply filters
   */
  applyFilters(): void {
    this.loadAppointments();
  }

  /**
   * Clear filters
   */
  clearFilters(): void {
    this.filters = {
      start_date: '',
      end_date: '',
      status: 'all',
      page: 1
    };
    this.setupDateFilters();
    this.loadAppointments();
  }

  /**
   * Handle calendar date click
   */
  onDateClick(event: any): void {
    const clickedDate = event.date;
    
    // Create a proper date object without timezone issues
    const localDate = new Date(clickedDate.getFullYear(), clickedDate.getMonth(), clickedDate.getDate());
    
    const appointmentsForDate = this.appointments.filter(appointment => 
      isSameDay(new Date(appointment.appointment_date), localDate)
    );
    
    if (appointmentsForDate.length > 0) {
      this.showAppointmentsForDate(appointmentsForDate, localDate);
    } else {
      this.showBlockSlotDialog(localDate);
    }
  }

  /**
   * Show appointments for a specific date
   */
  private showAppointmentsForDate(appointments: Appointment[], date: Date): void {
    const dialogRef = this.dialog.open(AppointmentDetailsDialog, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: {
        appointments: appointments,
        date: date,
        isDateView: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Date appointments dialog closed with result:', result);
        
        if (result.action === 'blockDay') {
          this.handleBlockDay(result.date);
        } else if (result.action === 'blockTimeSlots') {
          this.handleBlockTimeSlots(result.date, result.slots);
        }
      }
    });
  }

  /**
   * Show dialog to block a slot
   */
  private showBlockSlotDialog(date: Date): void {
    // Open the same dialog as for appointments, but with empty appointments array
    const dialogRef = this.dialog.open(AppointmentDetailsDialog, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: {
        appointments: [],
        date: date,
        isDateView: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Block slot dialog closed with result:', result);
        
        if (result.action === 'refresh') {
          this.loadAppointments();
        }
      }
    });
  }

  /**
   * Handle blocking entire day
   */
  private handleBlockDay(date: Date): void {
    // Create date string without timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    const message = `Möchten Sie den gesamten Tag ${date.toLocaleDateString('de-DE')} blockieren?`;
    
    if (confirm(message)) {
      // Block all available time slots for the day
      this.blockAllTimeSlotsForDay(dateString);
    }
  }

  /**
   * Block all time slots for a day
   */
  private blockAllTimeSlotsForDay(dateString: string): void {
    // Generate all possible time slots for the day
    const slots = this.generateTimeSlotsForDay(dateString);
    
    // Block each slot
    let blockedCount = 0;
    slots.forEach(slot => {
      this.appointmentService.blockSlot(dateString, slot).subscribe({
        next: () => {
          blockedCount++;
          if (blockedCount === slots.length) {
            this.snackBar.open(`Tag ${dateString} erfolgreich blockiert`, 'OK', {
              duration: 3000
            });
            this.loadAppointments();
          }
        },
        error: (error) => {
          console.error('Error blocking slot:', error);
        }
      });
    });
  }

  /**
   * Generate time slots for a day
   */
  private generateTimeSlotsForDay(dateString: string): string[] {
    const date = new Date(dateString);
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 0) return []; // Sunday - closed
    
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
    
    return slots;
  }

  /**
   * Open dialog to select specific time slots to block
   */
  private openTimeSlotBlockingDialog(dateString: string): void {
    const date = new Date(dateString);
    console.log('Loading blocked slots for:', dateString);
    
    // Load blocked slots asynchronously
    this.appointmentService.getBlockedSlots(dateString).subscribe({
      next: (response: any) => {
        const blockedSlots = response.blocked_slots || [];
        console.log('Blocked slots loaded:', blockedSlots);
        
        const dialogRef = this.dialog.open(TimeSlotBlockingDialog, {
          width: '700px',
          data: {
            date: date,
            blockedSlots: blockedSlots
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result && result.action === 'blockTimeSlots') {
            this.handleBlockTimeSlots(result.date, result.slots);
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
            blockedSlots: []
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

  /**
   * Handle blocking specific time slots
   */
  private handleBlockTimeSlots(date: Date, slots: string[]): void {
    // Create date string without timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    // Block each selected slot
    let blockedCount = 0;
    slots.forEach(slot => {
      this.appointmentService.blockSlot(dateString, slot).subscribe({
        next: () => {
          blockedCount++;
          if (blockedCount === slots.length) {
            this.snackBar.open(`${slots.length} Zeit-Slot(s) erfolgreich blockiert`, 'OK', {
              duration: 3000
            });
            this.loadAppointments();
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

  /**
   * Block a time slot
   */
  blockSlot(date: string, time: string): void {
    this.isBlockingSlot = true;
    
    this.appointmentService.blockSlot(date, time).subscribe({
      next: (response: any) => {
        this.snackBar.open(response.message, 'Schließen', {
          duration: 3000
        });
        this.loadAppointments();
        this.isBlockingSlot = false;
      },
      error: (error: any) => {
        console.error('Error blocking slot:', error);
        this.snackBar.open('Fehler beim Blockieren des Termins', 'Schließen', {
          duration: 3000
        });
        this.isBlockingSlot = false;
      }
    });
  }

  /**
   * Unblock a time slot
   */
  unblockSlot(appointmentId: number): void {
    this.appointmentService.unblockSlot(appointmentId).subscribe({
      next: (response: any) => {
        this.snackBar.open(response.message, 'Schließen', {
          duration: 3000
        });
        this.loadAppointments();
      },
      error: (error: any) => {
        console.error('Error unblocking slot:', error);
        this.snackBar.open('Fehler beim Freigeben des Termins', 'Schließen', {
          duration: 3000
        });
      }
    });
  }

  /**
   * Update appointment status
   */
  updateStatus(appointment: Appointment, newStatus: 'confirmed' | 'cancelled' | 'completed'): void {
    this.appointmentService.updateStatus(appointment.id!, newStatus).subscribe({
      next: (response: any) => {
        this.snackBar.open(response.message, 'Schließen', {
          duration: 3000
        });
        this.loadAppointments();
      },
      error: (error: any) => {
        console.error('Error updating status:', error);
        this.snackBar.open('Fehler beim Aktualisieren des Status', 'Schließen', {
          duration: 3000
        });
      }
    });
  }

  /**
   * Show appointment details
   */
  showAppointmentDetails(appointment: Appointment): void {
    // Create a simple dialog using MatDialog
    const dialogRef = this.dialog.open(AppointmentDetailsDialog, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: appointment
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Handle any actions after dialog closes
        console.log('Dialog closed with result:', result);
      }
    });
  }

  /**
   * Export appointments to CSV
   */
  exportToCSV(): void {
    const csvContent = this.generateCSVContent();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `termine_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Generate CSV content
   */
  private generateCSVContent(): string {
    const headers = [
      'Datum',
      'Uhrzeit',
      'Kunde',
      'E-Mail',
      'Telefon',
      'Service',
      'Status',
      'Nachricht'
    ];

    const rows = this.filteredAppointments.map(appointment => [
      appointment.appointment_date,
      appointment.appointment_time,
      appointment.customer_name,
      appointment.customer_email,
      appointment.customer_phone,
      this.appointmentService.getServiceTypeLabel(appointment.service_type),
      this.appointmentService.getStatusLabel(appointment.status),
      appointment.message || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Get formatted date for display
   */
  getFormattedDate(date: string): string {
    return this.appointmentService.formatDate(date);
  }

  /**
   * Get service type label
   */
  getServiceTypeLabel(serviceType: string): string {
    return this.appointmentService.getServiceTypeLabel(serviceType);
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    return this.appointmentService.getStatusLabel(status);
  }

  /**
   * Check if appointment is blocked by admin
   */
  isBlockedByAdmin(appointment: Appointment): boolean {
    return appointment.blocked_by_admin || false;
  }

  /**
   * Navigate calendar
   */
  navigateCalendar(direction: 'prev' | 'next'): void {
    if (direction === 'prev') {
      this.viewDate = subDays(startOfMonth(this.viewDate), 1);
    } else {
      this.viewDate = addDays(endOfMonth(this.viewDate), 1);
    }
    // Clear cache when navigating to force recalculation
    this.calendarDaysCache = [];
  }

  /**
   * Get calendar days for the current month view (with caching)
   */
  getCalendarDays(): Date[] {
    const currentMonth = this.viewDate.getMonth();
    
    // Return cached days if month hasn't changed
    if (this.lastViewDateMonth === currentMonth && this.calendarDaysCache.length > 0) {
      return this.calendarDaysCache;
    }
    
    const monthStart = startOfMonth(this.viewDate);
    const monthEnd = endOfMonth(this.viewDate);
    
    // Get the first day of the week (Monday = 1)
    const startOfWeek = monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1;
    const calendarStart = subDays(monthStart, startOfWeek);
    
    // Generate 42 days (6 weeks)
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      days.push(addDays(calendarStart, i));
    }
    
    // Cache the result
    this.calendarDaysCache = days;
    this.lastViewDateMonth = currentMonth;
    
    return days;
  }

  /**
   * Get appointments for a specific day
   */
  getAppointmentsForDay(day: Date): Appointment[] {
    return this.appointments.filter(appointment => 
      isSameDay(new Date(appointment.appointment_date), day)
    );
  }

  /**
   * Check if a day is today
   */
  isToday(day: Date): boolean {
    return isSameDay(day, new Date());
  }

  /**
   * Check if a day is in the current month
   */
  isCurrentMonth(day: Date): boolean {
    return day.getMonth() === this.viewDate.getMonth();
  }
}
