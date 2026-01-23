import {
  Component,
  computed,
  inject,
  input,
  Injector,
  resource,
  linkedSignal,
  untracked,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { fetchAsset } from '../../utils/fetchAsset';
import { ExampleImage, Gap } from '../../parser/types';
import { StateComponent } from '../../shared/state/state.component';
import { CardResourceLike } from '../../shared/types/card-resource.types';

type ImageResource = ExampleImage & { url: string };

type SentencePart = {
  text: string;
  isGap: boolean;
};

@Component({
  selector: 'app-learn-grammar-card',
  standalone: true,
  imports: [CommonModule, StateComponent],
  templateUrl: './learn-grammar-card.component.html',
  styleUrl: './learn-grammar-card.component.css',
  host: { role: 'article', 'aria-label': 'Flashcard' },
})
export class LearnGrammarCardComponent {
  card = input<CardResourceLike | null>(null);
  isRevealed = input<boolean>(false);
  onPlayAudio = input<((texts: string[]) => void) | null>(null);

  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);

  readonly selectedExample = computed(() =>
    this.card()?.value()?.data.examples?.find((ex) => ex.isSelected)
  );

  readonly sentence = computed(() => this.selectedExample()?.de ?? '');
  readonly gaps = computed(() => this.card()?.value()?.data.gaps ?? []);

  readonly audioSentence = computed(() =>
    this.isRevealed() ? this.sentence() : undefined
  );

  readonly sentenceParts = computed(() => {
    const sentence = this.sentence();
    const gaps = this.gaps();

    if (!gaps.length) {
      return [{ text: sentence, isGap: false }];
    }

    return this.buildSentenceParts(sentence, gaps);
  });

  readonly exampleImages = linkedSignal(() => {
    const example = this.selectedExample();

    return untracked(() => {
      if (!example?.images?.length) return [];

      return example.images
        .filter((img) => img.isFavorite)
        .map((image) =>
          resource<ImageResource, never>({
            injector: this.injector,
            loader: async () => {
              return {
                ...image,
                url: await fetchAsset(
                  this.http,
                  `/api/image/${image.id}?width=1200&height=1200`
                ),
              };
            },
          })
        );
    });
  });

  constructor() {
    effect(() => {
      const currentSentence = this.audioSentence();
      const playAudioFn = this.onPlayAudio();

      if (currentSentence && playAudioFn) {
        playAudioFn([currentSentence]);
      }
    });
  }

  private buildSentenceParts(sentence: string, gaps: Gap[]): SentencePart[] {
    const sortedGaps = [...gaps].sort((a, b) => a.startIndex - b.startIndex);

    const { parts, currentIndex } = sortedGaps.reduce(
      (acc, gap) => {
        const textBefore =
          gap.startIndex > acc.currentIndex
            ? [{ text: sentence.slice(acc.currentIndex, gap.startIndex), isGap: false }]
            : [];
        const gapPart = {
          text: sentence.slice(gap.startIndex, gap.startIndex + gap.length),
          isGap: true,
        };
        return {
          parts: [...acc.parts, ...textBefore, gapPart],
          currentIndex: gap.startIndex + gap.length,
        };
      },
      { parts: [] as SentencePart[], currentIndex: 0 }
    );

    const remainingText =
      currentIndex < sentence.length
        ? [{ text: sentence.slice(currentIndex), isGap: false }]
        : [];

    return [...parts, ...remainingText];
  }
}
