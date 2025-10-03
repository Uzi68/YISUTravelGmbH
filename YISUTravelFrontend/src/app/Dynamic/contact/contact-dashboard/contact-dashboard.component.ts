import { Component } from '@angular/core';
import {ContactCoverComponent} from "../contact-cover/contact-cover.component";
import {ContactFirstviewComponent} from "../contact-contactformular/contact-firstview.component";

@Component({
  selector: 'app-contact-dashboard',
  standalone: true,
  imports: [
    ContactCoverComponent,
    ContactFirstviewComponent
  ],
  templateUrl: './contact-dashboard.component.html',
  styleUrl: './contact-dashboard.component.css'
})
export class ContactDashboardComponent {

}
