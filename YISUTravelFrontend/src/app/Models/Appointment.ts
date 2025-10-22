export interface Appointment {
  id?: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  appointment_date: string;
  appointment_time: string;
  service_type: string;
  travelers_count: number;
  destination?: string | null;
  budget_range?: string | null;
  message?: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  blocked_by_admin?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AppointmentFormData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  appointment_date: string;
  appointment_time: string;
  service_type: string;
  travelers_count: number;
  destination?: string | null;
  budget_range?: string | null;
  message?: string | null;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  blocked?: boolean;
}

export interface BusinessHours {
  start: string;
  end: string;
}

export interface AvailableSlotsResponse {
  slots: string[];
  business_hours: BusinessHours;
}

export interface AppointmentResponse {
  success: boolean;
  message: string;
  appointment: Appointment;
}

export interface AppointmentFilters {
  start_date?: string;
  end_date?: string;
  status?: string;
  page?: number;
}

export interface AppointmentListResponse {
  data: Appointment[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
