import { Component } from '@angular/core';
import {Booking} from "../../../../../Models/Booking";
import {ActivatedRoute, Router, RouterLink} from "@angular/router";
import {BookingService} from "../../../../../Services/booking-service/booking.service";
import {CurrencyPipe, DatePipe, JsonPipe, NgIf} from "@angular/common";
import {FormsModule} from "@angular/forms";

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [
    RouterLink,
    NgIf,
    DatePipe,
    FormsModule,
    JsonPipe,
    CurrencyPipe
  ],
  templateUrl: './booking-detail.component.html',
  styleUrl: './booking-detail.component.css'
})
export class BookingDetailComponent {
  booking: Booking | null = null;
  loading = true;
  error = '';
  updatingStatus = false;

  statusOptions = [
    { value: 'confirmed', label: 'Bestätigt' },
    { value: 'cancelled', label: 'Storniert' },
    { value: 'pending', label: 'Ausstehend' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: BookingService
  ) {}

  ngOnInit(): void {
    this.loadBooking();
  }
  onStatusChange(newStatus: string): void {
    if (!this.booking) return;

    this.booking.status = newStatus as 'confirmed' | 'cancelled' | 'pending';
    this.updateStatus();
  }
  loadBooking(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Ungültige Buchungs-ID';
      this.loading = false;
      return;
    }

    this.bookingService.getBooking(+id).subscribe({
      next: (response) => {
        this.booking = response.booking;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Fehler beim Laden der Buchungsdetails';
        this.loading = false;
        console.error('Error loading booking:', error);
      }
    });
  }

  updateStatus(): void {
    if (!this.booking) return;

    this.updatingStatus = true;
    this.bookingService.updateStatus(this.booking.id, this.booking.status).subscribe({
      next: (response) => {
        this.updatingStatus = false;
        // Optional: Show success message
      },
      error: (error) => {
        this.error = 'Fehler beim Aktualisieren des Status';
        this.updatingStatus = false;
        console.error('Error updating status:', error);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/bookings']);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'confirmed': return 'badge bg-success';
      case 'cancelled': return 'badge bg-danger';
      case 'pending': return 'badge bg-warning';
      default: return 'badge bg-secondary';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'confirmed': return 'Bestätigt';
      case 'cancelled': return 'Storniert';
      case 'pending': return 'Ausstehend';
      default: return status;
    }
  }
}
