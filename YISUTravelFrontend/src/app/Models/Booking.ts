export interface Booking {
  id: number;
  booking_number: string;
  session_id: string;
  chat_id: number;
  visitor_id?: number;
  destination: string;
  travel_date: string;
  persons: number;
  status: 'confirmed' | 'cancelled' | 'pending';
  price?: number;
  metadata?: any;
  created_at: string;
  updated_at: string;

  // Relations
  chat?: any;
  visitor?: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
}

export interface BookingStats {
  total: number;
  confirmed: number;
  cancelled: number;
  pending: number;
}

export interface BookingResponse {
  success: boolean;
  bookings: Booking[];
  stats?: BookingStats;
  meta?: {
    current_page: number;
    total: number;
    per_page: number;
  };
}
