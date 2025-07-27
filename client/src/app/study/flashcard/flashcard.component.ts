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
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MostDueCardService } from '../../most-due-card.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AsyncPipe, CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import { fetchAsset } from '../../utils/fetchAsset';
import { fetchAudio } from '../../utils/fetchAudio';
import { ExampleImage } from '../../parser/types';
import { StateComponent } from '../../shared/state/state.component';
import { getWordTypeInfo } from '../../shared/word-type-translations';
import { getGenderInfo } from '../../shared/gender-translations';
import { CompressQueryPipe } from '../../utils/compress-query.pipe';
import { FsrsGradingService } from '../../fsrs-grading.service';
import { fetchJson } from '../../utils/fetchJson';

type ImageResource = ExampleImage & { url: string };
type Grade = 'Again' | 'Hard' | 'Good' | 'Easy';

@Component({
  selector: 'app-flashcard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    RouterModule,
    StateComponent,
    AsyncPipe,
    CompressQueryPipe,
  ],
  templateUrl: './flashcard.component.html',
  styleUrl: './flashcard.component.css',
})
export class FlashcardComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly mostDueCardService = inject(MostDueCardService);
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  private readonly fsrsGradingService = inject(FsrsGradingService);
  readonly card = this.mostDueCardService.card;

  readonly isRevealed = signal(false);

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
    // Play word audio first
    if (audioMap[word]) {
      await this.playAudio(audioMap[word]);
    }

    // Wait for delay then play example audio
    if (example && audioMap[example]) {
      await new Promise((resolve) => setTimeout(resolve, 1500)); // 1.5 second delay
      await this.playAudio(audioMap[example]);
    }
  }

  private async playAudio(audioId: string) {
    try {
      const audioUrl = await fetchAudio(this.http, `/api/audio/${audioId}`);
      const audio = new Audio(audioUrl);
      await audio
        .play()
        .catch((error) => console.warn('Audio playback failed:', error));
    } catch (error) {
      console.warn('Error loading audio:', error);
    }
  }

  toggleReveal() {
    this.isRevealed.update((revealed) => !revealed);
  }

  async gradeCard(grade: Grade) {
    const card = this.card.value();
    if (!card) return;

    try {
      await this.fsrsGradingService.gradeCard(card, grade);
      // Reload the card resource to get the next card
      this.card.reload();
      this.isRevealed.set(false);
    } catch (error) {
      console.error('Error grading card:', error);
    }
  }

  async markForReview(event: Event) {
    event.stopPropagation();
    const cardId = this.card.value()?.id;
    if (!cardId) return;

    try {
      await fetchJson(this.http, `/api/card/${cardId}`, {
        body: { readiness: 'IN_REVIEW' },
        method: 'PUT',
      });
      this.isRevealed.set(false);
      this.card.reload();
    } catch (error) {
      console.error('Error marking card for review:', error);
    }
  }
}
