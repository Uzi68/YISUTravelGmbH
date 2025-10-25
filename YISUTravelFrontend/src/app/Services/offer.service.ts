import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Offer {
  id: number;
  title: string;
  description: string;
  location: string;
  image_url?: string;
  price: number;
  currency: string;
  rating: number;
  badge?: string;
  highlights?: string[];
  duration?: string;
  inclusions?: string;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  formatted_price?: string;
  star_rating?: string;
}

export interface CreateOfferRequest {
  title: string;
  description: string;
  location: string;
  image_url?: string;
  price: number;
  currency?: string;
  rating?: number;
  badge?: string;
  highlights?: string[];
  duration?: string;
  inclusions?: string;
  is_featured?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateOfferRequest extends Partial<CreateOfferRequest> {}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: any;
}

@Injectable({
  providedIn: 'root'
})
export class OfferService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Öffentliche API-Calls (für Homepage)
  getAllOffers(): Observable<ApiResponse<Offer[]>> {
    return this.http.get<ApiResponse<Offer[]>>(`${this.apiUrl}/offers`, { withCredentials: true });
  }

  getActiveOffers(): Observable<ApiResponse<Offer[]>> {
    return this.http.get<ApiResponse<Offer[]>>(`${this.apiUrl}/offers/active`, { withCredentials: true });
  }

  getFeaturedOffer(): Observable<ApiResponse<Offer | null>> {
    return this.http.get<ApiResponse<Offer | null>>(`${this.apiUrl}/offers/featured`, { withCredentials: true });
  }

  getOfferById(id: number): Observable<ApiResponse<Offer>> {
    return this.http.get<ApiResponse<Offer>>(`${this.apiUrl}/offers/${id}`, { withCredentials: true });
  }

  // Admin API-Calls (mit Authentication)
  getAdminOffers(): Observable<ApiResponse<Offer[]>> {
    return this.http.get<ApiResponse<Offer[]>>(`${this.apiUrl}/admin/offers`, { withCredentials: true });
  }

  createOffer(offer: CreateOfferRequest | FormData): Observable<ApiResponse<Offer>> {
    return this.http.post<ApiResponse<Offer>>(`${this.apiUrl}/admin/offers`, offer, { withCredentials: true });
  }

  updateOffer(id: number, offer: UpdateOfferRequest | FormData): Observable<ApiResponse<Offer>> {
    return this.http.post<ApiResponse<Offer>>(`${this.apiUrl}/admin/offers/${id}?_method=PUT`, offer, { withCredentials: true });
  }

  deleteOffer(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/admin/offers/${id}`, { withCredentials: true });
  }

  toggleFeatured(id: number): Observable<ApiResponse<Offer>> {
    return this.http.post<ApiResponse<Offer>>(`${this.apiUrl}/admin/offers/${id}/toggle-featured`, {}, { withCredentials: true });
  }


  // Helper Methods
  formatPrice(price: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }

  generateStarRating(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  getImageUrl(imageUrl: string | null | undefined): string {
    if (!imageUrl) {
      return '/assets/default-offer.jpg';
    }
    
    // If it's already a full URL, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // If it's a Laravel storage URL like '/storage/offers/filename.jpg', prepend backend URL
    if (imageUrl.startsWith('/storage/')) {
      return `${environment.backendUrl}${imageUrl}`;
    }
    
    // If it's a relative path like 'offers/filename.jpg', construct full URL
    if (imageUrl.startsWith('offers/')) {
      return `${environment.backendUrl}/storage/${imageUrl}`;
    }
    
    // If it's just a filename, add offers prefix
    return `${environment.backendUrl}/storage/offers/${imageUrl}`;
  }
}

