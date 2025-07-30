import {
  Component,
  computed,
  inject,
  signal,
  Injector,
  resource,
  linkedSignal,
  untracked,
  effect,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MostDueCardService } from '../../most-due-card.service';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { HttpClient } from '@angular/common/http';
import { fetchAsset } from '../../utils/fetchAsset';
import { fetchAudio } from '../../utils/fetchAudio';
import { ExampleImage } from '../../parser/types';
import { StateComponent } from '../../shared/state/state.component';
import { getWordTypeInfo } from '../../shared/word-type-translations';
import { getGenderInfo } from '../../shared/gender-translations';
import { CardGradingButtonsComponent } from '../../shared/card-grading-buttons/card-grading-buttons.component';
import { CardActionsComponent } from '../../shared/card-actions/card-actions.component';

type ImageResource = ExampleImage & { url: string };

@Component({
  selector: 'app-learn-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    StateComponent,
    CardGradingButtonsComponent,
    CardActionsComponent,
  ],
  templateUrl: './learn-card.component.html',
  styleUrl: './learn-card.component.css',
})
export class LearnCardComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly mostDueCardService = inject(MostDueCardService);
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  readonly card = this.mostDueCardService.card;

  readonly isRevealed = signal(false);
  private currentAudio: HTMLAudioElement | null = null;
  private audioTimeout: number | null = null;

  readonly selectedExample = computed(() =>
    this.card.value()?.data.examples?.find((ex) => ex.isSelected)
  );
  readonly word = computed(() =>
    this.isRevealed()
      ? this.card.value()?.data.word
      : this.card.value()?.data.translation?.['hu']
  );
  readonly type = computed(() => this.card.value()?.data.type);
  readonly gender = computed(() => this.card.value()?.data.gender);
  readonly genderInfo = computed(() => {
    const gender = this.gender();
    return gender && this.isRevealed() ? getGenderInfo(gender) : undefined;
  });
  readonly forms = computed(() => this.card.value()?.data.forms);
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
    this.route.params.subscribe((params) => {
      params['sourceId'] &&
        this.mostDueCardService.setSelectedSourceId(params['sourceId']);
    });

    // Play audio based on what text is currently displayed
    effect(() => {
      const currentText = this.word();
      const currentExample = this.example();
      const audioMap = this.card.value()?.data.audio;

      if (currentText && audioMap) {
        this.playAudioSequence(currentText, currentExample, audioMap);
      }
    });
  }

  private async playAudioSequence(
    word: string,
    example: string | undefined,
    audioMap: Record<string, string>
  ) {
    // Stop any current audio playback first
    this.stopCurrentAudio();

    // Play word audio first
    if (audioMap[word]) {
      await this.playAudio(audioMap[word]);
    }

    // Wait for delay then play example audio
    if (example && audioMap[example]) {
      this.audioTimeout = window.setTimeout(async () => {
        await this.playAudio(audioMap[example]);
      }, 1500); // 1.5 second delay
    }
  }

  private async playAudio(audioId: string) {
    try {
      const audioUrl = await fetchAudio(this.http, `/api/audio/${audioId}`);
      this.currentAudio = new Audio(audioUrl);
      await this.currentAudio
        .play()
        .catch((error) => console.warn('Audio playback failed:', error));
    } catch (error) {
      console.warn('Error loading audio:', error);
    }
  }

  private stopCurrentAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    if (this.audioTimeout) {
      clearTimeout(this.audioTimeout);
      this.audioTimeout = null;
    }
  }

  toggleReveal() {
    this.isRevealed.update((revealed) => !revealed);
  }

  onCardProcessed() {
    this.isRevealed.set(false);
  }
}
