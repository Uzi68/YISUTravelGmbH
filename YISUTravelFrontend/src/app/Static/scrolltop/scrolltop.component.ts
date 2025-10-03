import {Component, HostListener, Inject, Output} from '@angular/core';
import {MatIcon} from "@angular/material/icon";
import {MatIconButton} from "@angular/material/button";
import {DOCUMENT, NgClass, NgIf} from "@angular/common";

@Component({
  selector: 'app-scrolltop',
  standalone: true,
  imports: [
    MatIcon,
    MatIconButton,
    NgClass,
    NgIf
  ],
  templateUrl: './scrolltop.component.html',
  styleUrl: './scrolltop.component.css'
})
export class ScrolltopComponent {
  windowScrolled: boolean = false;  // Initialize the property with a default value

  constructor(@Inject(DOCUMENT) private document: Document) {}

// Listen for scroll events
  @HostListener('window:scroll', [])
  onWindowScroll() {
    // Check scroll position and update windowScrolled property
    if (window.pageYOffset > 100) {
      this.windowScrolled = true;  // Button shows when scrolled more than 100px
    } else {
      this.windowScrolled = false;  // Button hides when scroll position is at the top
    }
  }

// Smooth scroll to the top
  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth' // This is the built-in smooth scroll behavior
    });
  }

  ngOnInit() {}

}
