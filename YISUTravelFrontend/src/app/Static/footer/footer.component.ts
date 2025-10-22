import { Component } from '@angular/core';
import {RouterLink, Router} from "@angular/router";


@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [
    RouterLink
  ],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  constructor(private router: Router) {}

  openAppointmentBooking(): void {
    this.router.navigate(['/termin-buchen']);
  }
}
