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
import { ExampleImage, GapData } from '../../parser/types';
import { StateComponent } from '../../shared/state/state.component';
import { CardResourceLike } from '../../shared/types/card-resource.types';

type ImageResource = ExampleImage & { url: string };

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

  readonly sentence = computed(() => {
    const cardData = this.card()?.value()?.data;
    if (!cardData?.sentence) return '';

    if (this.isRevealed()) {
      return cardData.sentence;
    }

    return this.getSentenceWithGaps(cardData.sentence, cardData.gaps);
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
      const isRevealed = this.isRevealed();
      const playAudioFn = this.onPlayAudio();
      const cardData = this.card()?.value()?.data;

      if (isRevealed && cardData?.sentence && playAudioFn) {
        playAudioFn([cardData.sentence]);
      }
    });
  }

  private getSentenceWithGaps(sentence: string, gaps?: GapData[]): string {
    if (!gaps || gaps.length === 0) return sentence;

    const sortedGaps = [...gaps].sort((a, b) => b.start - a.start);
    let result = sentence;

    sortedGaps.forEach((gap) => {
      const placeholder = '_'.repeat(Math.max(gap.text.length, 3));
      result = result.slice(0, gap.start) + placeholder + result.slice(gap.end);
    });

    return result;
  }
}
