import { Component } from '@angular/core';
import {MatAnchor, MatButton} from "@angular/material/button";

@Component({
  selector: 'app-interessante-themen',
  standalone: true,
  imports: [
    MatButton,
    MatAnchor
  ],
  templateUrl: './interessante-themen.component.html',
  styleUrl: './interessante-themen.component.css'
})
export class InteressanteThemenComponent {

}
