import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  QueryList,
  ViewChildren
} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {HomepageStatisticsService} from '../../../Services/statistics-service/homepage-statistics.service';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-homepage-thirdview',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule
  ],
  templateUrl: './homepage-thirdview.component.html',
  styleUrl: './homepage-thirdview.component.css'
})
export class HomepageThirdviewComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('box', { read: ElementRef }) boxElements!: QueryList<ElementRef>;

  buchungen = 200000;
  buchungenToday: number | null = null;
  zufriedeneKunden = 30000;
  zufriedeneKundenToday: number | null = null;

  private readonly isBrowser: boolean;
  private statsSubscription?: Subscription;
  private intersectionObserver?: IntersectionObserver;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private homepageStatisticsService: HomepageStatisticsService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.loadStatistics();
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) {
      return;
    }

    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        const target = entry.target as HTMLElement;

        if (entry.isIntersecting) {
          setTimeout(() => {
            target.classList.add('fade-in-up');
            target.style.opacity = '1';
            this.intersectionObserver?.unobserve(entry.target);
          }, index * 300);
        }
      });
    }, { threshold: 0.1 });

    this.boxElements.forEach((box) => {
      this.intersectionObserver?.observe(box.nativeElement as HTMLElement);
    });
  }

  ngOnDestroy(): void {
    this.statsSubscription?.unsubscribe();
    this.intersectionObserver?.disconnect();
  }

  private loadStatistics(): void {
    this.statsSubscription = this.homepageStatisticsService.getStatistics().subscribe({
      next: (stats) => {
        this.buchungen = stats.bookings.total;
        this.buchungenToday = stats.bookings.todayIncrement;
        this.zufriedeneKunden = stats.happyCustomers.total;
        this.zufriedeneKundenToday = stats.happyCustomers.todayIncrement;
      },
      error: (error) => {
        console.error('Failed to load homepage statistics', error);
      }
    });
  }
}
