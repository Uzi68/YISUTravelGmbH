import {Component, Inject, PLATFORM_ID} from '@angular/core';
import { isPlatformBrowser, NgIf } from '@angular/common';
import { CarouselSwipeDirective } from '../../../Directives/carousel-swipe.directive';

@Component({
  selector: 'app-swiper',
  standalone: true,
  imports: [NgIf, CarouselSwipeDirective],
  templateUrl: './swiper.component.html',
  styleUrl: './swiper.component.css',
})
export class SwiperComponent {
  isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }
}
