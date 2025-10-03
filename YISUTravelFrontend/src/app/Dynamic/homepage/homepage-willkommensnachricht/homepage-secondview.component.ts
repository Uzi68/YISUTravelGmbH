import {Component, ElementRef, Inject, PLATFORM_ID, QueryList, ViewChildren} from '@angular/core';
import {isPlatformBrowser} from "@angular/common";

@Component({
  selector: 'app-homepage-secondview',
  standalone: true,
  imports: [],
  templateUrl: './homepage-secondview.component.html',
  styleUrl: './homepage-secondview.component.css'
})
export class HomepageSecondviewComponent {
  @ViewChildren('textanimation', { read: ElementRef }) boxElements!: QueryList<ElementRef>;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      if (typeof IntersectionObserver !== 'undefined') {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry, index) => {
            const target = entry.target as HTMLElement;

            if (entry.isIntersecting) {
              // Add delay based on the index to make boxes appear one by one
              setTimeout(() => {
                target.classList.add('text-animation');
                target.style.opacity = '1';
                observer.unobserve(entry.target); // Stop observing once animated
              }, index * 100); // 300ms delay between each box (adjust as needed)
            }
          });
        }, { threshold: 0.1 });

        this.boxElements.forEach((box) => {
          observer.observe(box.nativeElement as HTMLElement);
        });
      } else {
        // Fallback behavior for browsers that do not support IntersectionObserver
        this.boxElements.forEach((box, index) => {
          setTimeout(() => {
            const target = box.nativeElement as HTMLElement;
            target.classList.add('text-animation');
            target.style.opacity = '1';
          }, index * 300);
        });
      }
    }
  }
}
