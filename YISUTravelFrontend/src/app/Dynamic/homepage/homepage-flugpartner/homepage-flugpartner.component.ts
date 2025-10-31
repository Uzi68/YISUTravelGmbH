import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CarouselSwipeDirective } from '../../../Directives/carousel-swipe.directive';

@Component({
  selector: 'app-homepage-flugpartner',
  standalone: true,
  imports: [CarouselSwipeDirective],
  templateUrl: './homepage-flugpartner.component.html',
  styleUrl: './homepage-flugpartner.component.css'
})
export class HomepageFlugpartnerComponent {
  isBrowser: boolean = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }
}
