import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface StaffUser {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  avatar: string;
  profile_image_url: string;
  roles: string[];
  created_at: string;
  updated_at: string;
  push_enabled?: boolean;
  push_device_count?: number;
  push_last_seen_at?: string;
  push_last_notified_at?: string;
}

export interface CreateStaffUserRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'Admin' | 'Agent';
  is_active?: boolean;
}

export interface UpdateStaffUserRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role?: 'Admin' | 'Agent';
  is_active?: boolean;
}

export interface UserProfile {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  user_type: string;
  is_active: boolean;
  avatar: string;
  profile_image_url: string;
  roles: string[];
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  current_password?: string;
  password?: string;
  password_confirmation?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  password: string;
  password_confirmation: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Staff Management (Admin only)
  getStaffUsers(): Observable<StaffUser[]> {
    return this.http.get<StaffUser[]>(`${this.apiUrl}/admin/staff`, { withCredentials: true });
  }

  createStaffUser(userData: CreateStaffUserRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/staff`, userData, { withCredentials: true });
  }

  updateStaffUser(id: number, userData: UpdateStaffUserRequest): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/staff/${id}`, userData, { withCredentials: true });
  }

  deleteStaffUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/staff/${id}`, { withCredentials: true });
  }

  // Profile Management
  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/profile`, { withCredentials: true });
  }

  updateProfile(profileData: UpdateProfileRequest): Observable<any> {
    return this.http.put(`${this.apiUrl}/profile`, profileData, { withCredentials: true });
  }

  // Password Management
  sendPasswordResetLink(request: PasswordResetRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/password/reset-link`, request, { withCredentials: true });
  }

  resetPassword(request: PasswordResetConfirmRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/password/reset`, request, { withCredentials: true });
  }

  changePassword(request: ChangePasswordRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/password/change`, request, { withCredentials: true });
  }

  // Profile Image Methods
  uploadProfileImage(formData: FormData): Observable<{ profile_image_url: string }> {
    return this.http.post<{ profile_image_url: string }>(`${this.apiUrl}/profile/upload-image`, formData, { withCredentials: true });
  }

  removeProfileImage(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/profile/remove-image`, { withCredentials: true });
  }
}
