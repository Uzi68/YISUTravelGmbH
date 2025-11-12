import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CustomerRegistrationRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
}

export interface CustomerProfile {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  user_type: string;
  created_at: string;
}

export interface ChatAttachment {
  id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  download_url: string;
}

export interface ChatMessage {
  id: number;
  content?: string | null;
  text?: string | null;
  sender_type?: string;
  from?: string;
  message_type?: string | null;
  created_at: string;
  attachments: ChatAttachment[];
}

export interface CustomerChat {
  id: number;
  status: string;
  channel: string;
  assigned_to: number;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export interface CustomerDashboardStats {
  total_chats: number;
  active_chats: number;
  resolved_chats: number;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Customer Registration
  register(customerData: CustomerRegistrationRequest): Observable<any> {
    console.log('Sending customer registration data:', customerData);
    return this.http.post(`${this.apiUrl}/customer/register`, customerData, { withCredentials: true });
  }

  // Customer Profile
  getProfile(): Observable<CustomerProfile> {
    return this.http.get<CustomerProfile>(`${this.apiUrl}/customer/profile`, { withCredentials: true });
  }

  // Chat History
  getChatHistory(): Observable<CustomerChat[]> {
    return this.http.get<CustomerChat[]>(`${this.apiUrl}/customer/chat-history`, { withCredentials: true });
  }

  // Dashboard Statistics
  getDashboardStats(): Observable<CustomerDashboardStats> {
    return this.http.get<CustomerDashboardStats>(`${this.apiUrl}/customer/dashboard-stats`, { withCredentials: true });
  }
}