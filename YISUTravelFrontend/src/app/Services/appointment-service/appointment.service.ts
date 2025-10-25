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
  private apiUrl = environment.apiUrl;

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

    return this.http.get<AppointmentListResponse>(`${this.apiUrl}/appointments`, { 
      params,
      withCredentials: true 
    });
  }

  /**
   * Get a specific appointment by ID
   */
  getAppointment(id: number): Observable<AppointmentResponse> {
    return this.http.get<AppointmentResponse>(`${this.apiUrl}/appointments/${id}`, {
      withCredentials: true
    });
  }

  /**
   * Update an appointment
   */
  updateAppointment(id: number, appointmentData: Partial<AppointmentFormData>): Observable<AppointmentResponse> {
    return this.http.put<AppointmentResponse>(`${this.apiUrl}/appointments/${id}`, appointmentData, {
      withCredentials: true
    });
  }

  /**
   * Cancel an appointment
   */
  cancelAppointment(id: number): Observable<AppointmentResponse> {
    return this.http.patch<AppointmentResponse>(`${this.apiUrl}/appointments/${id}/cancel`, {}, {
      withCredentials: true
    });
  }

  /**
   * Confirm an appointment
   */
  confirmAppointment(id: number): Observable<AppointmentResponse> {
    return this.http.patch<AppointmentResponse>(`${this.apiUrl}/appointments/${id}/confirm`, {}, {
      withCredentials: true
    });
  }

  /**
   * Delete an appointment
   */
  deleteAppointment(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/appointments/${id}`, {
      withCredentials: true
    });
  }

  /**
   * Block/unblock time slots (admin only)
   */
  blockTimeSlot(date: string, time: string, blocked: boolean): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/appointments/block`, {
      date,
      time
    }, {
      withCredentials: true
    });
  }

  /**
   * Get business hours
   */
  getBusinessHours(): Observable<{ start: string; end: string }> {
    return this.http.get<{ start: string; end: string }>(`${this.apiUrl}/appointments/business-hours`, {
      withCredentials: true
    });
  }

  /**
   * Update business hours (admin only)
   */
  updateBusinessHours(hours: { start: string; end: string }): Observable<{ success: boolean; message: string }> {
    return this.http.patch<{ success: boolean; message: string }>(`${this.apiUrl}/appointments/business-hours`, hours, {
      withCredentials: true
    });
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
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/appointments/block`, {
      date,
      time
    }, {
      withCredentials: true
    });
  }

  /**
   * Unblock a time slot (admin only)
   */
  unblockSlot(appointmentId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/appointments/unblock/${appointmentId}`, {
      withCredentials: true
    });
  }

  /**
   * Unblock a time slot by date and time (admin only)
   */
  unblockSlotByDateTime(date: string, time: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/appointments/unblock-by-datetime`, {
      date,
      time
    }, {
      withCredentials: true
    });
  }

  /**
   * Unblock multiple time slots (admin only)
   */
  unblockMultipleSlots(date: string, times: string[]): Observable<{ success: boolean; message: string; unblocked_count: number; errors: string[] }> {
    console.log('unblockMultipleSlots called with:', { date, times });
    return this.http.post<{ success: boolean; message: string; unblocked_count: number; errors: string[] }>(`${this.apiUrl}/appointments/unblock-multiple`, {
      date,
      times
    }, {
      withCredentials: true
    });
  }

  /**
   * Get blocked slots for a specific date
   */
  getBlockedSlots(date: string): Observable<{ success: boolean; blocked_slots: Array<{id: number, time: string, reason: string}> }> {
    return this.http.get<{ success: boolean; blocked_slots: Array<{id: number, time: string, reason: string}> }>(`${this.apiUrl}/appointments/blocked-slots`, {
      params: { date },
      withCredentials: true
    });
  }

  /**
   * Update appointment status
   */
  updateStatus(appointmentId: number, status: 'confirmed' | 'cancelled' | 'completed'): Observable<AppointmentResponse> {
    return this.http.patch<AppointmentResponse>(`${this.apiUrl}/appointments/${appointmentId}/status`, { status }, {
      withCredentials: true
    });
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
    // This method is kept for backward compatibility but budget ranges are no longer used
    return budgetRange;
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

  /**
   * Release a booked appointment (admin can free up slots when customers cancel)
   */
  releaseAppointment(appointmentId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/appointments/${appointmentId}/release`, {}, {
      withCredentials: true
    });
  }

  /**
   * Restore a cancelled appointment (admin can restore if customer rebooks)
   */
  restoreAppointment(appointmentId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/appointments/${appointmentId}/restore`, {}, {
      withCredentials: true
    });
  }
}