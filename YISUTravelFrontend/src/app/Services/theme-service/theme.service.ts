import { Injectable, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ThemeService implements OnDestroy {
  private readonly storageKey = 'dark-mode';
  private readonly darkModeSubject = new BehaviorSubject<boolean>(false);
  private readonly darkMode$ = this.darkModeSubject.asObservable().pipe(distinctUntilChanged());

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(DOCUMENT) private document: Document
  ) {
    if (isPlatformBrowser(this.platformId)) {
      const storedState = this.getInitialState();
      if (storedState !== null) {
        this.darkModeSubject.next(storedState);
      }
      this.applyTheme(this.darkModeSubject.value);
      window.addEventListener('storage', this.handleStorageEvent);
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('storage', this.handleStorageEvent);
    }
  }

  darkModeChanges(): Observable<boolean> {
    return this.darkMode$;
  }

  getDarkMode(): boolean {
    return this.darkModeSubject.value;
  }

  toggleDarkMode(): void {
    this.setDarkMode(!this.darkModeSubject.value);
  }

  setDarkMode(enabled: boolean): void {
    if (this.darkModeSubject.value === enabled) {
      return;
    }

    this.darkModeSubject.next(enabled);
    this.persistState(enabled);
    this.applyTheme(enabled);
  }

  private handleStorageEvent = (event: StorageEvent): void => {
    if (event.key !== this.storageKey || event.newValue === null) {
      return;
    }

    const enabled = this.safeParse(event.newValue);
    this.darkModeSubject.next(enabled);
    this.applyTheme(enabled);
  };

  private getInitialState(): boolean | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const storedValue = localStorage.getItem(this.storageKey);
    if (storedValue !== null) {
      return this.safeParse(storedValue);
    }

    return null;
  }

  private safeParse(value: string): boolean {
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }

    try {
      return JSON.parse(value);
    } catch (err) {
      console.warn('Failed to parse dark mode value from storage, falling back to false.', err);
      return false;
    }
  }

  private persistState(enabled: boolean): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(enabled));
  }

  private applyTheme(enabled: boolean): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const className = 'dark-mode';
    const documentElement = this.document.documentElement;
    const body = this.document.body;

    if (enabled) {
      documentElement.classList.add(className);
      body?.classList.add(className);
    } else {
      documentElement.classList.remove(className);
      body?.classList.remove(className);
    }
  }
}

