import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WindowService {

  constructor() { }

  get nativeWindow(): Window | null {
    return typeof window !== 'undefined' ? window : null;
  }
}
