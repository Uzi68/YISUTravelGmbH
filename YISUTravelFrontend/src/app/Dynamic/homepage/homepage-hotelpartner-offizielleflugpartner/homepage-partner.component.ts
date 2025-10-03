import { Component } from '@angular/core';
import {NgForOf} from "@angular/common";
import { CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";

@Component({
  selector: 'app-homepage-partner',
  standalone: true,
  imports: [
    NgForOf
  ],
  templateUrl: './homepage-partner.component.html',
  styleUrl: './homepage-partner.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomepagePartnerComponent {
}
