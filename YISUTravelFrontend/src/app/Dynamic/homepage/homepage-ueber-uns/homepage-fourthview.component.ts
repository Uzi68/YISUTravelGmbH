import {Component, ElementRef, HostListener, ViewChild} from '@angular/core';
import {NgClass} from "@angular/common";
import {RouterLink} from "@angular/router";
import {MatButton} from "@angular/material/button";

@Component({
  selector: 'app-homepage-fourthview',
  standalone: true,
  imports: [
    NgClass,
    RouterLink,
    MatButton
  ],
  templateUrl: './homepage-fourthview.component.html',
  styleUrl: './homepage-fourthview.component.css'
})
export class HomepageFourthviewComponent {
  //isScrolled: boolean = false;

  ngAfterViewInit() {
    // You can add a timeout here if needed for initial loading effects
  }

  /*
  @HostListener('window:scroll', [])
  onWindowScroll() {
    const bounding = document.querySelector('.about-us-container')?.getBoundingClientRect();
    if (bounding && bounding.top < window.innerHeight && bounding.bottom > 0) {
      this.isScrolled = true; // Set flag when in view
    }
  }
  */
}
