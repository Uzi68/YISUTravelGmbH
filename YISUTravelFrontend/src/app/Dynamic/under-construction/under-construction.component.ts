import { Component } from '@angular/core';
import {RouterLink} from "@angular/router";

@Component({
  selector: 'app-under-construction',
  standalone: true,
  imports: [
    RouterLink
  ],
  templateUrl: './under-construction.component.html',
  styleUrl: './under-construction.component.css'
})
export class UnderConstructionComponent {

  ngOnInit() {
    console.log("Hello from Safari!");

  }
}
