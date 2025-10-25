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

