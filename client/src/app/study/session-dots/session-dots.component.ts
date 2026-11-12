import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, input, signal } from '@angular/core';
import { StudySessionCard } from '../../parser/types';
import { CardState } from '../../shared/state/card-state';

@Component({
  selector: 'app-session-dots',
  templateUrl: './session-dots.component.html',
  styleUrl: './session-dots.component.css',
  host: { role: 'group', 'aria-label': 'Due cards' },
})
export class SessionDotsComponent {
  readonly Math = Math;
  readonly queue = input.required<StudySessionCard['queue']>();
  readonly activeId = input<string>();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  readonly columns = signal(1);
  readonly height = computed(() => Math.max(1, Math.ceil(this.queue().length / this.columns())) * 20);
  readonly names: Record<CardState, string> = {
    NEW: 'New', LEARNING: 'Learning', REVIEW: 'Review', RELEARNING: 'Relearning',
  };

  constructor() {
    afterNextRender(() => {
      const observer = new ResizeObserver(([entry]) => {
        this.columns.set(Math.max(1, Math.floor(entry.contentRect.width / 20)));
      });
      observer.observe(this.element.nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
