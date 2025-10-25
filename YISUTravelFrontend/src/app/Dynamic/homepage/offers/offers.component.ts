import { Component, OnInit } from '@angular/core';
import { RouterLink } from "@angular/router";
import { CommonModule } from '@angular/common';
import { OfferService, Offer } from '../../../Services/offer.service';

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [
    RouterLink,
    CommonModule
  ],
  templateUrl: './offers.component.html',
  styleUrl: './offers.component.css'
})
export class OffersComponent implements OnInit {
  featuredOffer: Offer | null = null;
  otherOffers: Offer[] = [];
  loading = false;
  error = '';

  constructor(private offerService: OfferService) {}

  ngOnInit(): void {
    this.loadOffers();
  }

  loadOffers(): void {
    this.loading = true;
    this.error = '';

    // Load featured offer
    this.offerService.getFeaturedOffer().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.featuredOffer = response.data;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading featured offer:', error);
        this.error = 'Fehler beim Laden des Hauptangebots';
        this.loading = false;
      }
    });

    // Load other active offers
    this.offerService.getActiveOffers().subscribe({
      next: (response) => {
        if (response.success) {
          this.otherOffers = response.data.slice(0, 3); // Show max 3 other offers
        }
      },
      error: (error) => {
        console.error('Error loading active offers:', error);
        if (!this.error) {
          this.error = 'Fehler beim Laden der Angebote';
        }
      }
    });
  }

  /**
   * Gibt alle Angebote zurück, die NICHT das Top-Angebot mit Badge sind
   * Wird für das Grid-Layout verwendet
   */
  getAllNonBadgeOffers(): Offer[] {
    const offers: Offer[] = [];
    
    // Wenn Featured Offer existiert ABER kein Badge hat, füge es hinzu
    if (this.featuredOffer && !this.featuredOffer.badge) {
      offers.push(this.featuredOffer);
    }
    
    // Füge alle anderen Angebote hinzu
    offers.push(...this.otherOffers);
    
    return offers;
  }

  /**
   * Prüft ob das Featured Offer in der großen Section angezeigt werden soll
   * Anzeige wenn ein Badge vorhanden ist (unabhängig vom is_featured Status)
   */
  shouldShowFeaturedSection(): boolean {
    return !!(this.featuredOffer && this.featuredOffer.badge);
  }

  formatPrice(price: number, currency: string = 'EUR'): string {
    return this.offerService.formatPrice(price, currency);
  }

  getImageUrl(imageUrl: string | null | undefined): string {
    return this.offerService.getImageUrl(imageUrl);
  }

  generateStarRating(rating: number): string {
    return this.offerService.generateStarRating(rating);
  }

  hasOffers(): boolean {
    return this.featuredOffer !== null || this.otherOffers.length > 0;
  }

  getFeaturedHighlights(): string[] {
    return this.featuredOffer?.highlights || [];
  }

  hasFeaturedHighlights(): boolean {
    return this.getFeaturedHighlights().length > 0;
  }
}
