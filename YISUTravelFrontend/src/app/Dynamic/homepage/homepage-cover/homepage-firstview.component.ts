import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-homepage-firstview',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './homepage-firstview.component.html',
  styleUrl: './homepage-firstview.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HomepageFirstviewComponent {

}
