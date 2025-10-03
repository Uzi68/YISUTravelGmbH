import { Component } from '@angular/core';
import {AboutUsCoverComponent} from "../about-us-cover/about-us-cover.component";
import {AboutUsFirstviewComponent} from "../about-us-firstview/about-us-firstview.component";
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-about-us-dashboard',
  standalone: true,
  imports: [
    AboutUsCoverComponent,
    AboutUsFirstviewComponent,
  ],
  templateUrl: './about-us-dashboard.component.html',
  styleUrl: './about-us-dashboard.component.css'
})
export class AboutUsDashboardComponent {

}
