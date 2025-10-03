import {Component} from '@angular/core';
import {
  MatAccordion, MatExpansionModule,
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle
} from "@angular/material/expansion";

@Component({
  selector: 'app-datenschutzerklaerung',
  standalone: true,
  imports: [
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelTitle,
    MatExpansionPanelHeader,
    MatExpansionModule
  ],
  templateUrl: './datenschutzerklaerung.component.html',
  styleUrl: './datenschutzerklaerung.component.css'
})
export class DatenschutzerklaerungComponent {

}
