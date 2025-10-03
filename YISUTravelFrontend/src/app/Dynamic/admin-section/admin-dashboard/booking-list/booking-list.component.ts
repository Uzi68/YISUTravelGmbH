import { Component } from '@angular/core';
import {BookingService} from "../../../../Services/booking-service/booking.service";
import {Booking, BookingResponse, BookingStats} from "../../../../Models/Booking";
import {CurrencyPipe, DatePipe, JsonPipe, NgClass, NgForOf, NgIf} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {RouterLink} from "@angular/router";

@Component({
  selector: 'app-booking-list',
  standalone: true,
  imports: [
    NgForOf,
    FormsModule,
    NgIf,
    DatePipe,
    NgClass,
    RouterLink,
    CurrencyPipe,
    JsonPipe
  ],
  templateUrl: './booking-list.component.html',
  styleUrl: './booking-list.component.css'
})
export class BookingListComponent {
  bookings: Booking[] = [];
  stats: BookingStats | null = null;
  loading = true;
  error = '';

  // Filter
  filters = {
    status: '',
    date_from: '',
    date_to: '',
    search: ''
  };

  constructor(private bookingService: BookingService) {}

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.loading = true;
    this.bookingService.getBookings(this.filters).subscribe({
      next: (response) => {
        this.bookings = response.bookings || [];
        this.stats = response.stats || null;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Fehler beim Laden der Buchungen';
        this.loading = false;
        console.error('Error loading bookings:', error);
      }
    });
  }

  applyFilters(): void {
    this.loadBookings();
  }

  clearFilters(): void {
    this.filters = {
      status: '',
      date_from: '',
      date_to: '',
      search: ''
    };
    this.loadBookings();
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
