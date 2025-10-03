import {Component, ElementRef, Inject, PLATFORM_ID, QueryList, ViewChild, ViewChildren} from '@angular/core';
import {MatAnchor, MatButton} from "@angular/material/button";
import {NgForOf, NgIf} from "@angular/common";
import {RouterLink} from "@angular/router";
import { isPlatformBrowser } from '@angular/common';
import {MatGridList, MatGridTile} from "@angular/material/grid-list";
export interface Tile {
  cols: number;
  rows: number;
  text: string;
  imageUrl: string;
}
@Component({
  selector: 'app-homepage-thirdview',
  standalone: true,
  imports: [
    MatButton,
    MatAnchor,
    NgForOf,
    NgIf,
    RouterLink,
    MatGridList,
    MatGridTile
  ],
  templateUrl: './homepage-thirdview.component.html',
  styleUrl: './homepage-thirdview.component.css'
})
export class HomepageThirdviewComponent {
  tiles: Tile[] = [
    {text: '1', cols: 3, rows: 1, imageUrl: '/hotel.jpg'},
    {text: '2', cols: 1, rows: 2, imageUrl: '/airplane.jpg'},
    {text: '3', cols: 1, rows: 1, imageUrl: '/reise.jpg'},
    {text: '4', cols: 2, rows: 1, imageUrl: '/mietwagen.jpg'},
  ];


  @ViewChildren('box', { read: ElementRef }) boxElements!: QueryList<ElementRef>;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) { // Only run in the browser
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
          const target = entry.target as HTMLElement;

          if (entry.isIntersecting) {
            // Add delay based on the index to make boxes appear one by one
            setTimeout(() => {
              target.classList.add('fade-in-up');
              target.style.opacity = '1';
              observer.unobserve(entry.target); // Stop observing once animated
            }, index * 300); // 300ms delay between each box (adjust as needed)
          }
        });
      }, { threshold: 0.1 });

      this.boxElements.forEach((box) => {
        observer.observe(box.nativeElement as HTMLElement);
      });
    }
  }
}
