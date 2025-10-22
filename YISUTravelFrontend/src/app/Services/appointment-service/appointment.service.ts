import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  Appointment, 
  AppointmentFormData, 
  AvailableSlotsResponse, 
  AppointmentResponse,
  AppointmentListResponse,
  AppointmentFilters 
} from '../../Models/Appointment';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl || 'http://localhost:8000/api';

  /**
   * Create a new appointment
   */
  createAppointment(appointmentData: AppointmentFormData): Observable<AppointmentResponse> {
    return this.http.post<AppointmentResponse>(`${this.apiUrl}/appointments`, appointmentData);
  }

  /**
   * Get available time slots for a specific date
   */
  getAvailableSlots(date: string): Observable<AvailableSlotsResponse> {
    return this.http.get<AvailableSlotsResponse>(`${this.apiUrl}/appointments/available-slots`, {
      params: { date }
    });
  }

  /**
   * Get all appointments with optional filters
   */
  getAppointments(filters?: AppointmentFilters): Observable<AppointmentListResponse> {
    let params: any = {};
    
    if (filters) {
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.status) params.status = filters.status;
      if (filters.page) params.page = filters.page.toString();
    }

    return this.http.get<AppointmentListResponse>(`${this.apiUrl}/appointments`, { params });
  }

  /**
   * Get a specific appointment by ID
   */
  getAppointment(id: number): Observable<AppointmentResponse> {
    return this.http.get<AppointmentResponse>(`${this.apiUrl}/appointments/${id}`);
  }

  /**
   * Update an appointment
   */
  updateAppointment(id: number, appointmentData: Partial<AppointmentFormData>): Observable<AppointmentResponse> {
    return this.http.put<AppointmentResponse>(`${this.apiUrl}/appointments/${id}`, appointmentData);
  }

  /**
   * Cancel an appointment
   */
  cancelAppointment(id: number): Observable<AppointmentResponse> {
    return this.http.patch<AppointmentResponse>(`${this.apiUrl}/appointments/${id}/cancel`, {});
  }

  /**
   * Confirm an appointment
   */
  confirmAppointment(id: number): Observable<AppointmentResponse> {
    return this.http.patch<AppointmentResponse>(`${this.apiUrl}/appointments/${id}/confirm`, {});
  }

  /**
   * Delete an appointment
   */
  deleteAppointment(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/appointments/${id}`);
  }

  /**
   * Block/unblock time slots (admin only)
   */
  blockTimeSlot(date: string, time: string, blocked: boolean): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(`${this.apiUrl}/appointments/block-slot`, {
      date,
      time,
      blocked
    });
  }

  /**
   * Get business hours
   */
  getBusinessHours(): Observable<{ start: string; end: string }> {
    return this.http.get<{ start: string; end: string }>(`${this.apiUrl}/appointments/business-hours`);
  }

  /**
   * Update business hours (admin only)
   */
  updateBusinessHours(hours: { start: string; end: string }): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(`${this.apiUrl}/appointments/business-hours`, hours);
  }

  /**
   * Get all appointments (alias for getAppointments)
   */
  getAllAppointments(filters?: AppointmentFilters): Observable<AppointmentListResponse> {
    return this.getAppointments(filters);
  }

  /**
   * Block a time slot (admin only)
   */
  blockSlot(date: string, time: string): Observable<{ success: boolean; message: string }> {
    return this.blockTimeSlot(date, time, true);
  }

  /**
   * Unblock a time slot (admin only)
   */
  unblockSlot(appointmentId: number): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(`${this.apiUrl}/appointments/${appointmentId}/unblock`, {});
  }

  /**
   * Update appointment status
   */
  updateStatus(appointmentId: number, status: 'confirmed' | 'cancelled' | 'completed'): Observable<AppointmentResponse> {
    return this.http.patch<AppointmentResponse>(`${this.apiUrl}/appointments/${appointmentId}/status`, { status });
  }

  /**
   * Get service type label
   */
  getServiceTypeLabel(serviceType: string): string {
    const serviceTypes: { [key: string]: string } = {
      'flight': 'Flugbuchung',
      'hotel': 'Hotelbuchung',
      'package': 'Pauschalreise',
      'custom': 'Individuelle Reise',
      'consultation': 'Reiseberatung',
      'beratung': 'Reiseberatung',
      'buchung': 'Buchung',
      'visum': 'Visum',
      'sonstiges': 'Sonstiges'
    };
    return serviceTypes[serviceType] || serviceType;
  }

  /**
   * Get budget range label
   */
  getBudgetRangeLabel(budgetRange: string): string {
    const budgetRanges: { [key: string]: string } = {
      'under-1000': 'Unter 1.000 €',
      '1000-2500': '1.000 - 2.500 €',
      '2500-5000': '2.500 - 5.000 €',
      '5000-10000': '5.000 - 10.000 €',
      'over-10000': 'Über 10.000 €'
    };
    return budgetRanges[budgetRange] || budgetRange;
  }

  /**
   * Get status label
   */
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
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}