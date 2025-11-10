import { Component } from '@angular/core';
import {HomepageFirstviewComponent} from "../homepage-cover/homepage-firstview.component";
import {HomepageSecondviewComponent} from "../homepage-willkommensnachricht/homepage-secondview.component";
import {HomepageThirdviewComponent} from "../homepage-tourismusexperten/homepage-thirdview.component";
import {HomepageContactComponent} from "../homepage-contact/homepage-contact.component";
import {HomepagePartnerComponent} from "../homepage-hotelpartner-offizielleflugpartner/homepage-partner.component";
import {HomepageIconsComponent} from "../homepage-icons/homepage-icons.component";
import {HomepageFeaturesComponent} from "../homepage-merkmale/homepage-features.component";
import {HomepageFlugpartnerComponent} from "../homepage-flugpartner/homepage-flugpartner.component";
import {HomepageServicesComponent} from "../homepage-services/homepage-services.component";
import {InteressanteThemenComponent} from "../interessante-themen/interessante-themen.component";
import {CustomerRatingsComponent} from "../homepage-customer-ratings/customer-ratings.component";
import {
  HomepageBezahlmoeglichkeitenNotfallserviceComponent
} from "../homepage-emergency/homepage-bezahlmoeglichkeiten-notfallservice.component";
import {SwiperComponent} from "../top-reiseziele/swiper.component";
import {OffersComponent} from "../offers/offers.component";
import {TestPusherComponent} from "../../admin-section/admin-dashboard/test-pusher/test-pusher.component";

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    HomepageFirstviewComponent,
    HomepageSecondviewComponent,
    HomepageThirdviewComponent,
    HomepageContactComponent,
    HomepagePartnerComponent,
    HomepageIconsComponent,
    HomepageFeaturesComponent,
    HomepageFlugpartnerComponent,
    HomepageServicesComponent,
    InteressanteThemenComponent,
    CustomerRatingsComponent,
    HomepageBezahlmoeglichkeitenNotfallserviceComponent,
    SwiperComponent,
    OffersComponent,
    TestPusherComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {

}
