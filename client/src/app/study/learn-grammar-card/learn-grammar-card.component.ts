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

  readonly sentence = computed(() => this.card()?.value()?.data.sentence ?? '');
  readonly gaps = computed(() => this.card()?.value()?.data.gaps ?? []);

  readonly displaySentence = computed(() => {
    const sentence = this.sentence();
    const gaps = this.gaps();
    const revealed = this.isRevealed();

    if (revealed || gaps.length === 0) {
      return sentence;
    }

    return this.applySentenceGaps(sentence, gaps);
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
      const revealed = this.isRevealed();
      const currentSentence = this.sentence();
      const playAudioFn = this.onPlayAudio();

      if (revealed && currentSentence && playAudioFn) {
        playAudioFn([currentSentence]);
      }
    });
  }

  private applySentenceGaps(sentence: string, gaps: Gap[]): string {
    if (!gaps.length) return sentence;

    const sortedGaps = [...gaps].sort((a, b) => b.startIndex - a.startIndex);

    let result = sentence;
    for (const gap of sortedGaps) {
      const gapPlaceholder = '_'.repeat(gap.length);
      result =
        result.slice(0, gap.startIndex) +
        gapPlaceholder +
        result.slice(gap.startIndex + gap.length);
    }
    return result;
  }
}
