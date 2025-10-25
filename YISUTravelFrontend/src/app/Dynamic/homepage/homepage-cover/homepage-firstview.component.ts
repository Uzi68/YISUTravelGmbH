import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-homepage-firstview',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './homepage-firstview.component.html',
  styleUrl: './homepage-firstview.component.css'
})
export class HomepageFirstviewComponent implements OnInit {
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
