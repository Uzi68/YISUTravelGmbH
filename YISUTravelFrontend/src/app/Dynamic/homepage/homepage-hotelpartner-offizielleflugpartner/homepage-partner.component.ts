import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import {NgForOf} from "@angular/common";
import { CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-homepage-partner',
  standalone: true,
  imports: [
    NgForOf
  ],
  templateUrl: './homepage-partner.component.html',
  styleUrl: './homepage-partner.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomepagePartnerComponent implements OnInit {
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
