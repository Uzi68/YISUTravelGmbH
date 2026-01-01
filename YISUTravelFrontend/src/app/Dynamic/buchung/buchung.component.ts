import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-buchung',
  standalone: true,
  imports: [],
  templateUrl: './buchung.component.html',
  styleUrl: './buchung.component.css'
})
export class BuchungComponent implements OnInit, OnDestroy {
  // Statistics that increase daily with random numbers (3-9)
  buchungen: number = 0;
  zufriedeneKunden: number = 0;
  rechnungen: number = 0;
  
  private readonly STORAGE_KEY_PREFIX = 'buchung_stats_';
  private readonly DATE_KEY = 'last_update_date';
  private updateIntervalId: number | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.initializeStatistics();
    this.updateDaily();
  }

  private initializeStatistics(): void {
    const today = new Date().toDateString();
    const lastUpdateDate = this.getLocalStorageItem(this.DATE_KEY);

    if (!lastUpdateDate || lastUpdateDate !== today) {
      // New day - get previous values and add random (3-9)
      const yesterdayBuchungen = this.getStoredValue('buchungen', 200000);
      const yesterdayZufriedeneKunden = this.getStoredValue('zufriedeneKunden', 20500);
      const yesterdayRechnungen = this.getStoredValue('rechnungen', 200000);

      // Add random number (3-9) daily
      const randomBuchungen = Math.floor(Math.random() * 7) + 3;
      const randomZufriedeneKunden = Math.floor(Math.random() * 7) + 3;
      const randomRechnungen = Math.floor(Math.random() * 7) + 3;

      this.buchungen = yesterdayBuchungen + randomBuchungen;
      this.zufriedeneKunden = yesterdayZufriedeneKunden + randomZufriedeneKunden;
      this.rechnungen = yesterdayRechnungen + randomRechnungen;

      // Store updated values
      this.storeValue('buchungen', this.buchungen);
      this.storeValue('zufriedeneKunden', this.zufriedeneKunden);
      this.storeValue('rechnungen', this.rechnungen);
      this.setLocalStorageItem(this.DATE_KEY, today);
    } else {
      // Same day - use stored values
      this.buchungen = this.getStoredValue('buchungen', 200000);
      this.zufriedeneKunden = this.getStoredValue('zufriedeneKunden', 20500);
      this.rechnungen = this.getStoredValue('rechnungen', 200000);
    }
  }

  private updateDaily(): void {
    // Check daily if a new day has started
    this.updateIntervalId = window.setInterval(() => {
      const today = new Date().toDateString();
      const lastUpdateDate = this.getLocalStorageItem(this.DATE_KEY);

      if (lastUpdateDate !== today) {
        this.initializeStatistics();
      }
    }, 60000); // Check every minute
  }

  private getStoredValue(key: string, defaultValue: number): number {
    const stored = this.getLocalStorageItem(this.STORAGE_KEY_PREFIX + key);
    return stored ? parseInt(stored, 10) : defaultValue;
  }

  private storeValue(key: string, value: number): void {
    this.setLocalStorageItem(this.STORAGE_KEY_PREFIX + key, value.toString());
  }

  ngOnDestroy(): void {
    if (this.updateIntervalId !== null) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = null;
    }
  }

  private getLocalStorageItem(key: string): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(key);
    }
    return null;
  }

  private setLocalStorageItem(key: string, value: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(key, value);
    }
  }
}

