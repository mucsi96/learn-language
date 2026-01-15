import {
  Component,
  computed,
  inject,
  input,
  output,
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
import { LanguageTexts } from '../../shared/voice-selection-dialog/voice-selection-dialog.component';
import { CardResourceLike } from '../../shared/types/card-resource.types';

type ImageResource = ExampleImage & { url: string };

@Component({
  selector: 'app-learn-speech-card',
  standalone: true,
  imports: [
    CommonModule,
    StateComponent,
  ],
  templateUrl: './learn-speech-card.component.html',
  styleUrl: './learn-speech-card.component.css',
  host: { role: 'article', 'aria-label': 'Speech Card' },
})
export class LearnSpeechCardComponent {
  card = input<CardResourceLike | null>(null);
  isRevealed = input<boolean>(false);
  onPlayAudio = input<((texts: string[]) => void) | null>(null);
  languageTextsReady = output<LanguageTexts[]>();

  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);

  readonly sentence = computed(() =>
    this.isRevealed()
      ? this.card()?.value()?.data.sentence
      : this.card()?.value()?.data.translation?.['hu']
  );

  readonly images = linkedSignal(() => {
    const cardData = this.card()?.value()?.data;

    return untracked(() => {
      if (!cardData?.images?.length) return [];

      return cardData.images
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
      const currentSentence = this.sentence();
      const playAudioFn = this.onPlayAudio();

      if (currentSentence && playAudioFn) {
        playAudioFn([currentSentence]);
      }
    });

    effect(() => {
      const card = this.card();
      if (card?.value()) {
        this.languageTextsReady.emit(this.getLanguageTextsForVoiceDialog());
      }
    });
  }

  getLanguageTextsForVoiceDialog(): LanguageTexts[] {
    const card = this.card()?.value();
    if (!card?.data) return [];

    const result: LanguageTexts[] = [];

    if (card.data.sentence) {
      result.push({ language: 'de', texts: [card.data.sentence] });
    }

    if (card.data.translation?.['hu']) {
      result.push({ language: 'hu', texts: [card.data.translation['hu']] });
    }

    return result;
  }
}
