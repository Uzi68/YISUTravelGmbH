import { Component, OnDestroy, OnInit } from '@angular/core';
import {ActivatedRoute, NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {NavbarComponent} from "./Static/navbar/navbar.component";
import {filter, Subject, takeUntil} from "rxjs";
import {WindowService} from "./Services/window-service/window.service";
import {SEOService} from "./Services/SEOServices/seo.service";
import {LivechatComponent} from "./Static/livechat/livechat.component";
import {ScrolltopComponent} from "./Static/scrolltop/scrolltop.component";
import { ChatUiComponent} from "./Static/livechat/chatbot-ui/chatbot-ui.component";
import {NgIf} from "@angular/common";
import {ChatbotService} from "./Services/chatbot-service/chatbot.service";
import {StaffPushNotificationService} from "./Services/push-notification/staff-push-notification.service";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, LivechatComponent, ScrolltopComponent, ChatUiComponent, NgIf],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  isAdminDashboardRoute = false;
  isAuthenticated: boolean | undefined;
  isChatOpen = false
  private isInitialNavigation = true; // Track if this is the first navigation
  private readonly destroy$ = new Subject<void>(); // For automatic cleanup of all subscriptions

  constructor(
    private router: Router, 
    private windowRef: WindowService,
    private seoService: SEOService,
    private activatedRoute: ActivatedRoute,
    private chatbot: ChatbotService,
    private staffPushNotifications: StaffPushNotificationService
  ) {
    // Subscribe to chat open state
    this.chatbot.isChatOpen$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isOpen => {
        this.isChatOpen = isOpen;
      });
  }

  ngOnInit() {
    this.staffPushNotifications.initialize();
    const pendingChat = this.staffPushNotifications.consumePendingChatIdentifier();
    if (pendingChat) {
      this.router.navigate(['/admin-dashboard'], {
        queryParams: { chatId: pendingChat }
      }).catch(console.error);
    }

    // Single subscription to router events - handles navigation and SEO updates
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: NavigationEnd) => {
        // Update admin dashboard route flag
        this.isAdminDashboardRoute = event.url.includes('/admin-dashboard');
        
        // Handle scrolling - skip initial navigation to prevent double-load effect
        const window = this.windowRef.nativeWindow;
        if (window && !this.isInitialNavigation) {
          // Use requestAnimationFrame for smoother scrolling and to avoid layout issues
          requestAnimationFrame(() => {
            window.scrollTo(0, 0);
          });
        }
        
        // Mark that initial navigation is complete
        if (this.isInitialNavigation) {
          this.isInitialNavigation = false;
        }

        const route = this.getDeepestRoute(this.activatedRoute);
        const data = route.snapshot?.data ?? {};
        const { title, description, keywords, ogUrl, author, canonical } = data;

        this.seoService.updateTitle(title || 'YISU Travel GmbH');
        this.seoService.updateDescription(description || '');
        this.seoService.updateKeywords(keywords || '');
        this.seoService.updateOgUrl(ogUrl);
        this.seoService.updateAuthor(author || '');
        this.seoService.updateCanonical(canonical);
      });
  }

  ngOnDestroy() {
    // Clean up all subscriptions automatically
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getDeepestRoute(route: ActivatedRoute): ActivatedRoute {
    let current = route;
    while (current.firstChild) {
      current = current.firstChild;
    }
    return current;
  }

  /* In styles.css add to skip animation:
    scroll-behavior: auto !important;
   */

}

