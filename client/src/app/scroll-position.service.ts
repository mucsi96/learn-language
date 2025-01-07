import { Injectable, signal, untracked } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ScrollPositionService {
  public readonly scrollPosition = signal(0);
  private eventListener?: () => void;

  public restoreScrollPosition() {
    this.detach();

    const scrollPosition = untracked(() => this.scrollPosition());

    setTimeout(() => {
      window.scrollTo(0, scrollPosition);
    }, 100);

    this.eventListener = () => {
      this.scrollPosition.set(window.scrollY);
    };

    window.addEventListener('scroll', this.eventListener);
  }

  public detach() {
    if (this.eventListener) {
      window.removeEventListener('scroll', this.eventListener);
    }
  }
}
