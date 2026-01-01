import { Component, Inject, PLATFORM_ID } from '@angular/core';
import {NgForOf} from "@angular/common";
import { isPlatformBrowser } from '@angular/common';
import { CarouselSwipeDirective } from '../../../Directives/carousel-swipe.directive';

@Component({
  selector: 'app-homepage-partner',
  standalone: true,
  imports: [
    NgForOf,
    CarouselSwipeDirective
  ],
  templateUrl: './homepage-partner.component.html',
  styleUrl: './homepage-partner.component.css'
})
export class HomepagePartnerComponent {
  isBrowser: boolean = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }
}
