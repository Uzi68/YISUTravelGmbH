import {Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, Inject, PLATFORM_ID, QueryList, ViewChildren, OnInit} from '@angular/core';
import {isPlatformBrowser, NgClass, NgForOf} from "@angular/common";
import {RouterLink, Router} from "@angular/router";
import {MatButton, MatFabAnchor, MatFabButton, MatButtonModule} from "@angular/material/button";
import {MatIcon, MatIconModule} from "@angular/material/icon";

@Component({
  selector: 'app-homepage-contact',
  standalone: true,
  imports: [
    NgForOf,
    NgClass,
    RouterLink,
    MatButton,
    MatFabButton,
    MatIcon,
    MatFabAnchor,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './homepage-contact.component.html',
  styleUrl: './homepage-contact.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomepageContactComponent implements OnInit {
  isOpen = false;
  isBrowser: boolean = false;

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  constructor(
    private router: Router, 
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

  openAppointmentBooking(): void {
    this.router.navigate(['/termin-buchen']);
  }

  @ViewChildren('carouselanimation') boxElements!: QueryList<ElementRef>;

/*
  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      if (typeof IntersectionObserver !== 'undefined') {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry, index) => {
              const target = entry.target as HTMLElement;

              if (entry.isIntersecting) {
                // Delay the start of the animation itself
                setTimeout(() => {
                  target.classList.add('fade-in-bottom');
                  target.style.opacity = '1';
                  observer.unobserve(entry.target); // Stop observing once animated
                }, 300 + index * 500); // Add delay before fade-in starts
              }
            });
          },
          {threshold: 0.1}
        );

        this.boxElements.forEach((box) => {
          observer.observe(box.nativeElement as HTMLElement);
        });
      } else {
        // Fallback for unsupported browsers
        this.boxElements.forEach((box, index) => {
          setTimeout(() => {
            const target = box.nativeElement as HTMLElement;
            target.classList.add('fade-in-bottom');
            target.style.opacity = '1';
          }, 300 + index * 500); // Add delay before fade-in starts
        });
      }
    }
  }
  */
}
