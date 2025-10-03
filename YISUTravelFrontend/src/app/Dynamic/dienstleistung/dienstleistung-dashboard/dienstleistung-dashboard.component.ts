import { Component } from '@angular/core';
import {DienstleistungCoverComponent} from "../dienstleistung-cover/dienstleistung-cover.component";
import {DienstleistungServicesComponent} from "../dienstleistung-services/dienstleistung-services.component";

@Component({
  selector: 'app-dienstleistung-dashboard',
  standalone: true,
  imports: [
    DienstleistungCoverComponent,
    DienstleistungServicesComponent
  ],
  templateUrl: './dienstleistung-dashboard.component.html',
  styleUrl: './dienstleistung-dashboard.component.css'
})
export class DienstleistungDashboardComponent {

}
