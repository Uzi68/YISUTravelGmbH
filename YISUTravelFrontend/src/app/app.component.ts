import { Component } from '@angular/core';
import {ActivatedRoute, NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {NavbarComponent} from "./Static/navbar/navbar.component";
import {HomepageFirstviewComponent} from "./Dynamic/homepage/homepage-cover/homepage-firstview.component";
import {filter, mergeMap, Subscription} from "rxjs";
import {WindowService} from "./Services/window-service/window.service";
import {SEOService} from "./Services/SEOServices/seo.service";
import {map} from "rxjs/operators";
import {LivechatComponent} from "./Static/livechat/livechat.component";
import {ScrolltopComponent} from "./Static/scrolltop/scrolltop.component";
import { ChatUiComponent} from "./Static/livechat/chatbot-ui/chatbot-ui.component";
import {NgIf} from "@angular/common";
import {ChatbotService} from "./Services/chatbot-service/chatbot.service";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, HomepageFirstviewComponent, LivechatComponent, ScrolltopComponent, ChatUiComponent, NgIf],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  isAdminDashboardRoute = false;
  //Scroll instantly to the top after a routerLink is clicked
  private subscription: Subscription | undefined;
  isAuthenticated: boolean | undefined;
  isChatOpen = false

  constructor(private router: Router, private windowRef: WindowService,
              private seoService: SEOService,
              private activatedRoute: ActivatedRoute,
              private chatbot: ChatbotService
              ) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.isAdminDashboardRoute = event.url.includes('/admin-dashboard');
      });
    this.chatbot.isChatOpen$.subscribe(isOpen => {
      this.isChatOpen = isOpen;
    });
  }
  ngOnInit() {
    // Scrolling to top logic
    this.subscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const window = this.windowRef.nativeWindow; // Safely access the window object
        if (window) {
    //      console.log('Scrolling to top');
          window.scrollTo(0, 0);
        }
      });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => this.activatedRoute),
        map((route) => {
          while (route.firstChild) route = route.firstChild;
          return route;
        }),
        filter((route) => route.outlet === 'primary'),
        mergeMap((route) => route.data)
      )
      .subscribe((data) => {
        const { title, description, keywords, ogUrl, author, canonical } = data;

        this.seoService.updateTitle(title || 'YISU Travel GmbH');
        this.seoService.updateDescription(description || '');
        this.seoService.updateKeywords(keywords || ''); // Adding keywords
        this.seoService.updateOgUrl(ogUrl);
        this.seoService.updateAuthor(author || ''); // Adding author
        this.seoService.updateCanonical(canonical);
      });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe(); // Clean up subscription
    }
  }

  /* In styles.css add to skip animation:
    scroll-behavior: auto !important;
   */

}

