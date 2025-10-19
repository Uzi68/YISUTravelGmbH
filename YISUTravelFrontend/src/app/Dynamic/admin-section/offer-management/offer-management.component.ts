import { Component, OnInit } from '@angular/core';
import { OfferService, Offer, CreateOfferRequest } from '../../../Services/offer.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { OfferDialogComponent, OfferDialogData } from '../offer-dialog/offer-dialog.component';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-offer-management',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './offer-management.component.html',
  styleUrl: './offer-management.component.css'
})
export class OfferManagementComponent implements OnInit {
  offers: Offer[] = [];
  featuredOffer: Offer | null = null;
  otherOffers: Offer[] = [];
  loading = false;
  error = '';

  constructor(
    private offerService: OfferService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadOffers();
  }

  loadOffers(): void {
    this.loading = true;
    this.error = '';

    // Load all offers for admin management
    this.offerService.getAdminOffers().subscribe({
      next: (response) => {
        if (response.success) {
          this.offers = response.data;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading offers:', error);
        this.error = 'Fehler beim Laden der Angebote';
        this.loading = false;
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

  createOffer(): void {
    const dialogData: OfferDialogData = {
      offer: undefined,
      isEdit: false
    };

    const dialogRef = this.dialog.open(OfferDialogComponent, {
      width: '600px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        // Reload offers after successful creation
        this.loadOffers();
      }
    });
  }

  editOffer(offer: Offer): void {
    const dialogData: OfferDialogData = {
      offer: offer,
      isEdit: true
    };

    const dialogRef = this.dialog.open(OfferDialogComponent, {
      width: '600px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        // Reload offers after successful edit
        this.loadOffers();
      }
    });
  }

  deleteOffer(offer: Offer): void {
    // TODO: Implement delete offer confirmation
    console.log('Delete offer clicked:', offer);
  }

  toggleFeatured(offer: Offer): void {
    this.offerService.toggleFeatured(offer.id).subscribe({
      next: (response) => {
        if (response.success) {
          // Update the offer in the local array
          const index = this.offers.findIndex(o => o.id === offer.id);
          if (index !== -1) {
            this.offers[index] = response.data;
          }
          
          // Show success message
          console.log('Featured status updated successfully');
        }
      },
      error: (error) => {
        console.error('Error updating featured status:', error);
      }
    });
  }
}
