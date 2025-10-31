import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-buchung',
  standalone: true,
  imports: [],
  templateUrl: './buchung.component.html',
  styleUrl: './buchung.component.css'
})
export class BuchungComponent implements OnInit {
  // Statistics that increase daily with random numbers (0-9)
  buchungen: number = 0;
  zufriedeneKunden: number = 0;
  rechnungen: number = 0;
  
  private readonly STORAGE_KEY_PREFIX = 'buchung_stats_';
  private readonly DATE_KEY = 'last_update_date';

  ngOnInit(): void {
    this.initializeStatistics();
    this.updateDaily();
  }

  private initializeStatistics(): void {
    const today = new Date().toDateString();
    const lastUpdateDate = localStorage.getItem(this.DATE_KEY);

    if (!lastUpdateDate || lastUpdateDate !== today) {
      // New day - get previous values and add random (0-9)
      const yesterdayBuchungen = this.getStoredValue('buchungen', 200000);
      const yesterdayZufriedeneKunden = this.getStoredValue('zufriedeneKunden', 20500);
      const yesterdayRechnungen = this.getStoredValue('rechnungen', 200000);

      // Add random number (0-9) daily
      const randomBuchungen = Math.floor(Math.random() * 10);
      const randomZufriedeneKunden = Math.floor(Math.random() * 10);
      const randomRechnungen = Math.floor(Math.random() * 10);

      this.buchungen = yesterdayBuchungen + randomBuchungen;
      this.zufriedeneKunden = yesterdayZufriedeneKunden + randomZufriedeneKunden;
      this.rechnungen = yesterdayRechnungen + randomRechnungen;

      // Store updated values
      this.storeValue('buchungen', this.buchungen);
      this.storeValue('zufriedeneKunden', this.zufriedeneKunden);
      this.storeValue('rechnungen', this.rechnungen);
      localStorage.setItem(this.DATE_KEY, today);
    } else {
      // Same day - use stored values
      this.buchungen = this.getStoredValue('buchungen', 200000);
      this.zufriedeneKunden = this.getStoredValue('zufriedeneKunden', 20500);
      this.rechnungen = this.getStoredValue('rechnungen', 200000);
    }
  }

  private updateDaily(): void {
    // Check daily if a new day has started
    setInterval(() => {
      const today = new Date().toDateString();
      const lastUpdateDate = localStorage.getItem(this.DATE_KEY);

      if (lastUpdateDate !== today) {
        this.initializeStatistics();
      }
    }, 60000); // Check every minute
  }

  private getStoredValue(key: string, defaultValue: number): number {
    const stored = localStorage.getItem(this.STORAGE_KEY_PREFIX + key);
    return stored ? parseInt(stored, 10) : defaultValue;
  }

  private storeValue(key: string, value: number): void {
    localStorage.setItem(this.STORAGE_KEY_PREFIX + key, value.toString());
  }
}

