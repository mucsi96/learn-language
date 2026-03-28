import { Injectable, signal, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class DataRefreshService {
  private readonly router = inject(Router);
  private readonly version = signal(0);
  private isFirstNavigation = true;

  readonly refreshTrigger = this.version.asReadonly();

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        if (this.isFirstNavigation) {
          this.isFirstNavigation = false;
          return;
        }
        this.version.update((v) => v + 1);
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.version.update((v) => v + 1);
      }
    });
  }
}
