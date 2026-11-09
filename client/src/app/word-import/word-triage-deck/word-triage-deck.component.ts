import { Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import {
  GenderTranslation,
  getGenderInfo,
} from '../../shared/gender-translations';
import {
  WordTypeTranslation,
  getWordTypeInfo,
} from '../../shared/word-type-translations';
import { WordImportCandidate, WordImportDecision } from '../word-import.types';

const SWIPE_COMMIT_DISTANCE = 110;
const SWIPE_HINT_DISTANCE = 24;
const TAP_DISTANCE = 8;
const VISIBLE_DECK_SIZE = 3;

// Nominative singular articles only; the analyzer emits singular lemmas,
// so plural "die" (which any gender can take) never reaches this map.
const ARTICLE_GENDERS: Record<string, GenderTranslation['gender']> = {
  der: 'MASCULINE',
  die: 'FEMININE',
  das: 'NEUTER',
};

type DeckItem = {
  candidate: WordImportCandidate;
  wordTypeInfo: WordTypeTranslation | undefined;
  articleColor: string | undefined;
  backTitle: string;
  example: string | undefined;
};

function toArticleColor(article: string | undefined): string | undefined {
  const gender = article ? ARTICLE_GENDERS[article.toLowerCase()] : undefined;
  return gender ? getGenderInfo(gender)?.color : undefined;
}

@Component({
  selector: 'app-word-triage-deck',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './word-triage-deck.component.html',
  styleUrl: './word-triage-deck.component.css',
})
export class WordTriageDeckComponent {
  readonly candidates = input.required<WordImportCandidate[]>();
  readonly decided = output<WordImportDecision>();

  private readonly pointerStart = signal<number | null>(null);
  private readonly maxDragDistance = signal(0);

  readonly dragOffset = signal(0);
  readonly dragging = computed(() => this.pointerStart() !== null);

  readonly revealed = linkedSignal<number | undefined, boolean>({
    source: () => this.candidates()[0]?.id,
    computation: () => false,
  });

  readonly items = computed<DeckItem[]>(() =>
    this.candidates()
      .slice(0, VISIBLE_DECK_SIZE)
      .map((candidate) => ({
        candidate,
        wordTypeInfo: candidate.wordType
          ? getWordTypeInfo(candidate.wordType.toUpperCase())
          : undefined,
        articleColor: toArticleColor(candidate.article),
        backTitle: candidate.article
          ? `${candidate.article} ${candidate.lemma}`
          : candidate.lemma,
        example: candidate.examples[0],
      }))
  );

  readonly frontItems = computed(() => this.items().slice(0, 1));
  readonly stackItems = computed(() => this.items().slice(1));

  readonly hintedDecision = computed<WordImportDecision | null>(() => {
    const offset = this.dragOffset();

    if (offset <= -SWIPE_HINT_DISTANCE) {
      return 'known';
    }

    return offset >= SWIPE_HINT_DISTANCE ? 'card' : null;
  });

  readonly frontTransform = computed(() => {
    const offset = this.dragOffset();
    return `translateX(${offset}px) rotate(${offset / 25}deg)`;
  });

  toggleReveal(): void {
    this.revealed.update((revealed) => !revealed);
  }

  onKeyToggle(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.toggleReveal();
  }

  onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    this.pointerStart.set(event.clientX);
    this.maxDragDistance.set(0);
  }

  onPointerMove(event: PointerEvent): void {
    const start = this.pointerStart();

    if (start === null) {
      return;
    }

    const offset = event.clientX - start;
    this.dragOffset.set(offset);
    this.maxDragDistance.set(
      Math.max(this.maxDragDistance(), Math.abs(offset))
    );
  }

  onPointerCancel(): void {
    this.pointerStart.set(null);
    this.dragOffset.set(0);
  }

  onPointerUp(): void {
    const wasDragging = this.dragging();
    const offset = this.dragOffset();
    this.pointerStart.set(null);
    this.dragOffset.set(0);

    if (offset <= -SWIPE_COMMIT_DISTANCE) {
      this.decided.emit('known');
      return;
    }

    if (offset >= SWIPE_COMMIT_DISTANCE) {
      this.decided.emit('card');
      return;
    }

    if (wasDragging && this.maxDragDistance() < TAP_DISTANCE) {
      this.toggleReveal();
    }
  }
}
