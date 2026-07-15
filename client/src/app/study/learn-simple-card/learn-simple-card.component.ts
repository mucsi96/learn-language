import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { StateComponent } from '../../shared/state/state.component';
import { CardResourceLike } from '../../shared/types/card-resource.types';
import { MarkdownPipe } from '../../shared/markdown.pipe';

@Component({
  selector: 'app-learn-simple-card',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, StateComponent, MarkdownPipe],
  templateUrl: './learn-simple-card.component.html',
  styleUrl: './learn-simple-card.component.css',
  host: { role: 'article', 'aria-label': 'Flashcard' },
})
export class LearnSimpleCardComponent {
  card = input<CardResourceLike | null>(null);
  isRevealed = input<boolean>(false);
  readonly revealRequested = output<void>();

  readonly frontText = computed(() => this.card()?.value()?.data.frontText ?? '');
  readonly backText = computed(() => this.card()?.value()?.data.backText ?? '');
  readonly topic = computed(() => this.card()?.value()?.data.topic);
  readonly category = computed(() => this.card()?.value()?.data.category);
  readonly typingPractice = computed(
    () => this.card()?.value()?.source.typingPractice === true
  );

  readonly typedAnswer = signal('');

  private readonly clearTypedAnswerOnCardChange = effect(() => {
    this.card()?.value();
    this.typedAnswer.set('');
  });

  submitAnswer(event: Event): void {
    event.preventDefault();
    this.revealRequested.emit();
  }
}
