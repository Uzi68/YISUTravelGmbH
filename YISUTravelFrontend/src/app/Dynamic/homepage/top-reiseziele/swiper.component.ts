import {Component, Inject, PLATFORM_ID, OnInit} from '@angular/core';
import { CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { isPlatformBrowser, NgIf } from '@angular/common';

@Component({
  selector: 'app-swiper',
  standalone: true,
  imports: [NgIf],
  templateUrl: './swiper.component.html',
  styleUrl: './swiper.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SwiperComponent implements OnInit {
  isBrowser: boolean;

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
