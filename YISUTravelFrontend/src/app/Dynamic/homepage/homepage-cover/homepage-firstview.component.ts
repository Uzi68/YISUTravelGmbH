import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { CarouselSwipeDirective } from '../../../Directives/carousel-swipe.directive';

@Component({
  selector: 'app-homepage-firstview',
  standalone: true,
  imports: [RouterLink, CarouselSwipeDirective],
  templateUrl: './homepage-firstview.component.html',
  styleUrl: './homepage-firstview.component.css'
})
export class HomepageFirstviewComponent {
  isBrowser: boolean = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }
}