import { Component, computed, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { getWordTypeTranslation } from '../../shared/word-type-translations';
import { WordImportCandidate, WordImportDecision } from '../word-import.types';

const SWIPE_COMMIT_DISTANCE = 110;
const SWIPE_HINT_DISTANCE = 24;
const MAX_VISIBLE_EXAMPLES = 3;
const VISIBLE_DECK_SIZE = 3;
const STEM_TRIM = 2;
const MIN_STEM_LENGTH = 3;

type ExampleSegment = {
  text: string;
  highlighted: boolean;
};

type DeckItem = {
  candidate: WordImportCandidate;
  wordTypeLabel: string | null;
  examples: ExampleSegment[][];
};

function toStem(lemma: string): string {
  const normalized = lemma.trim().toLowerCase();
  return normalized.length > MIN_STEM_LENGTH + STEM_TRIM
    ? normalized.slice(0, normalized.length - STEM_TRIM)
    : normalized;
}

function toSegments(example: string, stem: string): ExampleSegment[] {
  return example
    .split(/(\s+)/)
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      highlighted:
        stem.length >= MIN_STEM_LENGTH && part.toLowerCase().includes(stem),
    }));
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

  readonly dragOffset = signal(0);
  readonly dragging = computed(() => this.pointerStart() !== null);

  readonly items = computed<DeckItem[]>(() =>
    this.candidates()
      .slice(0, VISIBLE_DECK_SIZE)
      .map((candidate) => {
        const stem = toStem(candidate.lemma);
        return {
          candidate,
          wordTypeLabel: candidate.wordType
            ? getWordTypeTranslation(candidate.wordType.toUpperCase())
            : null,
          examples: candidate.examples
            .slice(0, MAX_VISIBLE_EXAMPLES)
            .map((example) => toSegments(example, stem)),
        };
      })
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

  onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    this.pointerStart.set(event.clientX);
  }

  onPointerMove(event: PointerEvent): void {
    const start = this.pointerStart();

    if (start === null) {
      return;
    }

    this.dragOffset.set(event.clientX - start);
  }

  onPointerUp(): void {
    const offset = this.dragOffset();
    this.pointerStart.set(null);
    this.dragOffset.set(0);

    if (offset <= -SWIPE_COMMIT_DISTANCE) {
      this.decided.emit('known');
      return;
    }

    if (offset >= SWIPE_COMMIT_DISTANCE) {
      this.decided.emit('card');
    }
  }
}
