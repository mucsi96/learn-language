import { Component, computed, input } from '@angular/core';
import { StateComponent } from '../../shared/state/state.component';
import { CardResourceLike } from '../../shared/types/card-resource.types';
import { MarkdownPipe } from '../../shared/markdown.pipe';

@Component({
  selector: 'app-learn-simple-card',
  standalone: true,
  imports: [StateComponent, MarkdownPipe],
  templateUrl: './learn-simple-card.component.html',
  styleUrl: './learn-simple-card.component.css',
  host: { role: 'article', 'aria-label': 'Flashcard' },
})
export class LearnSimpleCardComponent {
  card = input<CardResourceLike | null>(null);
  isRevealed = input<boolean>(false);

  readonly frontText = computed(() => this.card()?.value()?.data.frontText ?? '');
  readonly backText = computed(() => this.card()?.value()?.data.backText ?? '');
  readonly topic = computed(() => this.card()?.value()?.data.topic);
}
