import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class VisibilityService {
  public readonly visibility = signal(true);

  constructor() {
    document.addEventListener('visibilitychange', () => {
      this.visibility.set(!document.hidden);
    });
  }
}
