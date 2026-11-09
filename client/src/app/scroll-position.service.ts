import { Injectable, signal, untracked } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ScrollPositionService {
  public scrollPosition = 0;
  private eventListener?: () => void;

  public restoreScrollPosition() {
    this.detach();

    setTimeout(() => {
      window.scrollTo(0, this.scrollPosition);
    }, 100);

    this.eventListener = () => {
      this.scrollPosition = window.scrollY;
    };

    window.addEventListener('scroll', this.eventListener);
  }

  public detach() {
    if (this.eventListener) {
      window.removeEventListener('scroll', this.eventListener);
    }
  }
}
