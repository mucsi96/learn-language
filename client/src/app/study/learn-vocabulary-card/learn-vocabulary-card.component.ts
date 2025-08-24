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
  ResourceRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { HttpClient } from '@angular/common/http';
import { fetchAsset } from '../../utils/fetchAsset';
import { Card, ExampleImage } from '../../parser/types';
import { StateComponent } from '../../shared/state/state.component';
import { getWordTypeInfo } from '../../shared/word-type-translations';
import { getGenderInfo } from '../../shared/gender-translations';

type ImageResource = ExampleImage & { url: string };

@Component({
  selector: 'app-learn-vocabulary-card',
  standalone: true,
  imports: [
    CommonModule,
    MatChipsModule,
    StateComponent,
  ],
  templateUrl: './learn-vocabulary-card.component.html',
  styleUrl: './learn-vocabulary-card.component.css',
})
export class LearnVocabularyCardComponent {
  card = input<ResourceRef<Card | null | undefined> | null>(null);
  isRevealed = input<boolean>(false);
  onPlayAudio = input<((texts: string[]) => void) | null>(null);

  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);

  readonly selectedExample = computed(() =>
    this.card()?.value()?.data.examples?.find((ex) => ex.isSelected)
  );
  readonly word = computed(() =>
    this.isRevealed()
      ? this.card()?.value()?.data.word
      : this.card()?.value()?.data.translation?.['hu']
  );
  readonly type = computed(() => this.card()?.value()?.data.type);
  readonly gender = computed(() => this.card()?.value()?.data.gender);
  readonly genderInfo = computed(() => {
    const gender = this.gender();
    return gender && this.isRevealed() ? getGenderInfo(gender) : undefined;
  });
  readonly forms = computed(() => this.card()?.value()?.data.forms);
  readonly wordTypeInfo = computed(() => {
    const type = this.type();
    return type ? getWordTypeInfo(type) : undefined;
  });

  readonly example = computed(() =>
    this.isRevealed()
      ? this.selectedExample()?.['de']
      : this.selectedExample()?.['hu']
  );

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
    // Play audio based on what text is currently displayed
    effect(() => {
      const currentWord = this.word();
      const currentExample = this.example();
      const playAudioFn = this.onPlayAudio();

      if (currentWord && playAudioFn) {
        const texts = [currentWord, currentExample].filter(Boolean) as string[];
        playAudioFn(texts);
      }
    });
  }
}
