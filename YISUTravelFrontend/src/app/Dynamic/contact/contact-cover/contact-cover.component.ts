import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CarouselSwipeDirective } from '../../../Directives/carousel-swipe.directive';

@Component({
  selector: 'app-contact-cover',
  standalone: true,
  imports: [CarouselSwipeDirective],
  templateUrl: './contact-cover.component.html',
  styleUrl: './contact-cover.component.css'
})
export class ContactCoverComponent implements OnInit {
  isBrowser: boolean = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    // Bootstrap Carousel wird automatisch initialisiert durch data-bs-ride="carousel"
    // Keine zusätzliche Initialisierung erforderlich
  }
}
