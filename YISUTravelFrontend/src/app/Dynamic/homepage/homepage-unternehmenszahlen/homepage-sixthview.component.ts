import {Component, ElementRef, QueryList, ViewChildren} from '@angular/core';
import {NgForOf} from "@angular/common";

@Component({
  selector: 'app-homepage-sixthview',
  standalone: true,
  imports: [
    NgForOf
  ],
  templateUrl: './homepage-sixthview.component.html',
  styleUrl: './homepage-sixthview.component.css'
})
export class HomepageSixthviewComponent {
  counters = [
    {label: 'Buchungen', startValue: 0, endValue: 200000, icon: '#icon1', currentValue: 200000},
    {label: 'Zufriedene Kunden', startValue: 0, endValue: 20500, icon: '#icon2', currentValue: 20500},
    {label: 'Rechnungen', startValue: 0, endValue: 200000, icon: '#icon3', currentValue: 200000},
    {label: 'Jahre Erfahrung', startValue: 0, endValue: 14, icon: '#icon4', currentValue: 14}
  ];
}
