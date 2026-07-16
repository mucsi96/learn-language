import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  resource,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { StateComponent } from '../../shared/state/state.component';
import { CardResourceLike } from '../../shared/types/card-resource.types';
import { MarkdownPipe } from '../../shared/markdown.pipe';
import { ENVIRONMENT_CONFIG } from '../../environment/environment.config';
import { fetchJson } from '../../utils/fetchJson';

interface AnswerCheckResult {
  correct: boolean;
  explanation: string | null;
}

@Component({
  selector: 'app-learn-simple-card',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    StateComponent,
    MarkdownPipe,
  ],
  templateUrl: './learn-simple-card.component.html',
  styleUrl: './learn-simple-card.component.css',
  host: { role: 'article', 'aria-label': 'Flashcard' },
})
export class LearnSimpleCardComponent {
  private readonly http = inject(HttpClient);
  private readonly environmentConfig = inject(ENVIRONMENT_CONFIG);

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

  readonly answerCheck = resource({
    params: () => {
      const cardId = this.card()?.value()?.id;
      const answer = this.typedAnswer().trim();
      return this.isRevealed() && this.typingPractice() && cardId && answer
        ? { cardId, answer }
        : undefined;
    },
    loader: ({ params }) => this.checkAnswer(params.cardId, params.answer),
  });

  readonly answerCorrect = computed(
    () => this.answerCheck.hasValue() && this.answerCheck.value()?.correct === true
  );

  readonly answerFeedback = computed(() => {
    if (!this.answerCheck.hasValue()) {
      return null;
    }
    const result = this.answerCheck.value();
    if (!result || result.correct) {
      return null;
    }
    return result.explanation || 'Your answer does not match the expected answer.';
  });

  private readonly clearTypedAnswerOnCardChange = effect(() => {
    this.card()?.value();
    this.typedAnswer.set('');
  });

  submitAnswer(event: Event): void {
    event.preventDefault();
    this.revealRequested.emit();
  }

  private async checkAnswer(cardId: string, answer: string): Promise<AnswerCheckResult> {
    const model = this.environmentConfig.primaryModelByOperation['answer_check'];
    if (!model) {
      throw new Error('No primary model configured for answer check');
    }
    return fetchJson<AnswerCheckResult>(
      this.http,
      `/api/card/${cardId}/check-answer?model=${model}`,
      { method: 'POST', body: { answer } }
    );
  }
}
