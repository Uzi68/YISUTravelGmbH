import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CarouselSwipeDirective } from '../../../Directives/carousel-swipe.directive';

@Component({
  selector: 'app-customer-ratings',
  standalone: true,
  imports: [
    CarouselSwipeDirective
  ],
  templateUrl: './customer-ratings.component.html',
  styleUrl: './customer-ratings.component.css'
})
export class CustomerRatingsComponent {
  isBrowser: boolean = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }
}
