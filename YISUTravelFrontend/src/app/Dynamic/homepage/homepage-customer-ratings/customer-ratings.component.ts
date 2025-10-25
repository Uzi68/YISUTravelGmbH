import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-customer-ratings',
  standalone: true,
  imports: [
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './customer-ratings.component.html',
  styleUrl: './customer-ratings.component.css'
})
export class CustomerRatingsComponent implements OnInit {
  isBrowser: boolean = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  async ngOnInit() {
    if (this.isBrowser) {
      // Initialize Swiper elements
      try {
        const { register } = await import('swiper/element/bundle');
        register();
      } catch (error) {
        console.error('Swiper initialization failed:', error);
      }
    }
  }
}
