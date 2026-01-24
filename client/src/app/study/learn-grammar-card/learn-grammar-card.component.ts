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
import { ExampleImage } from '../../parser/types';
import { StateComponent } from '../../shared/state/state.component';
import { CardResourceLike } from '../../shared/types/card-resource.types';
import { GRAMMAR_GAP_REGEX } from '../../shared/constants/grammar.constants';

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

  readonly audioSentence = computed(() => {
    if (!this.isRevealed()) return undefined;
    return this.sentence().replace(GRAMMAR_GAP_REGEX, '$1');
  });

  readonly sentenceParts = computed(() => {
    const sentence = this.sentence();
    return this.buildSentenceParts(sentence);
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

  private buildSentenceParts(sentence: string): SentencePart[] {
    const matches = [...sentence.matchAll(GRAMMAR_GAP_REGEX)];

    if (matches.length === 0) {
      return [{ text: sentence, isGap: false }];
    }

    const { parts, lastIndex } = matches.reduce(
      (acc, match) => {
        const textBefore = match.index > acc.lastIndex
          ? [{ text: sentence.slice(acc.lastIndex, match.index), isGap: false }]
          : [];
        const gapPart = { text: match[1], isGap: true };

        return {
          parts: [...acc.parts, ...textBefore, gapPart],
          lastIndex: match.index + match[0].length,
        };
      },
      { parts: [] as SentencePart[], lastIndex: 0 }
    );

    const remainingText = lastIndex < sentence.length
      ? [{ text: sentence.slice(lastIndex), isGap: false }]
      : [];

    return [...parts, ...remainingText];
  }
}
