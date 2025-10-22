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
    private snackBar: MatSnackBar
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
        this.snackBar.open('Fehler beim Laden der Termine', 'Schließen', {
          duration: 3000
        });
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
    const appointmentsForDate = this.appointments.filter(appointment => 
      isSameDay(new Date(appointment.appointment_date), clickedDate)
    );
    
    if (appointmentsForDate.length > 0) {
      this.showAppointmentsForDate(appointmentsForDate, clickedDate);
    } else {
      this.showBlockSlotDialog(clickedDate);
    }
  }

  /**
   * Show appointments for a specific date
   */
  private showAppointmentsForDate(appointments: Appointment[], date: Date): void {
    // This would open a dialog showing appointments for the selected date
    console.log('Appointments for', format(date, 'dd.MM.yyyy'), appointments);
  }

  /**
   * Show dialog to block a slot
   */
  private showBlockSlotDialog(date: Date): void {
    // This would open a dialog to block a specific time slot
    console.log('Block slot for', format(date, 'dd.MM.yyyy'));
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
    // This would open a dialog with appointment details
    console.log('Show details for appointment:', appointment);
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
      'Reisende',
      'Reiseziel',
      'Budget',
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
      appointment.travelers_count,
      appointment.destination || '',
      appointment.budget_range ? this.appointmentService.getBudgetRangeLabel(appointment.budget_range) : '',
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
      this.viewDate = subDays(this.viewDate, 1);
    } else {
      this.viewDate = addDays(this.viewDate, 1);
    }
  }
}
