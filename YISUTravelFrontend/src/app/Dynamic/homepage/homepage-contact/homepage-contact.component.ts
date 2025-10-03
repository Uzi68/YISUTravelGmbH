import {Component, ElementRef, Inject, PLATFORM_ID, QueryList, ViewChildren} from '@angular/core';
import {isPlatformBrowser, NgClass, NgForOf} from "@angular/common";
import {RouterLink} from "@angular/router";
import {TerminVereinbarenComponent} from "./termin-vereinbaren/termin-vereinbaren.component";
import {MatDialog} from "@angular/material/dialog";
import {MatButton, MatFabAnchor, MatFabButton} from "@angular/material/button";
import {MatIcon} from "@angular/material/icon";

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
    MatFabAnchor

  ],
  templateUrl: './homepage-contact.component.html',
  styleUrl: './homepage-contact.component.css'
})
export class HomepageContactComponent {
  isOpen = false;

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  constructor(private dialog: MatDialog, @Inject(PLATFORM_ID) private platformId: Object) {
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(TerminVereinbarenComponent, {
      width: '1000px',
      autoFocus: false,
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed. Selected date:', result);
    });
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
