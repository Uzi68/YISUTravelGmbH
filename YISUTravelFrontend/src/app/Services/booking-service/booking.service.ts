import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from "@angular/common/http";
import {Observable} from "rxjs";
import {Booking, BookingResponse, BookingStats} from "../../Models/Booking";

@Injectable({
  providedIn: 'root'
})
export class BookingService {

  constructor(private http: HttpClient) { }

  private  apiUrl = 'http://localhost:8000/api';
 // private apiUrl = 'https://backend.yisu-travel.de/api';

  // Alle Buchungen abrufen
  // Alle Buchungen ohne Pagination
  getBookings(filters?: any): Observable<{ success: boolean; bookings: Booking[]; stats?: BookingStats }> {
    let params = new HttpParams();

    if (filters) {
      if (filters.status) params = params.set('status', filters.status);
      if (filters.date_from) params = params.set('date_from', filters.date_from);
      if (filters.date_to) params = params.set('date_to', filters.date_to);
      if (filters.search) params = params.set('search', filters.search);
    }

    return this.http.get<{ success: boolean; bookings: Booking[]; stats?: BookingStats }>(
      `${this.apiUrl}/bookings`,
      { params }
    );
  }

  getBooking(id: number): Observable<{ success: boolean; booking: Booking }> {
    return this.http.get<{ success: boolean; booking: Booking }>(`${this.apiUrl}/bookings/${id}`);
  }

  updateStatus(bookingId: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/bookings/${bookingId}/status`, { status });
  }
}
