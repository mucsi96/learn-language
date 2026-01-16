import {
  Component,
  input,
  output,
  computed,
  inject,
  linkedSignal,
  signal,
  untracked,
  effect,
  Injector,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { resource } from '@angular/core';
import { Card, CardData, ExampleImage } from '../../types';
import { fetchAsset } from '../../../utils/fetchAsset';
import { fetchJson } from '../../../utils/fetchJson';
import { ENVIRONMENT_CONFIG } from '../../../environment/environment.config';
import { ImageSourceRequest } from '../../../shared/types/image-generation.types';

@Component({
  selector: 'app-edit-speech-card',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatLabel,
    MatInputModule,
    MatButtonModule,
    MatIcon,
    MatProgressSpinnerModule,
  ],
  templateUrl: './edit-speech-card.component.html',
  styleUrl: './edit-speech-card.component.css',
})
export class EditSpeechCardComponent {
  selectedCardId = input<string | undefined>();
  selectedSourceId = input<string | undefined>();
  selectedPageNumber = input<number | undefined>();
  card = input<Card | undefined>();
  cardUpdate = output<any>();
  markAsReviewedAvailable = output<boolean>();

  private readonly injector = inject(Injector);
  private readonly http = inject(HttpClient);
  private readonly environmentConfig = inject(ENVIRONMENT_CONFIG);

  readonly sentence = linkedSignal(() => this.card()?.data.word);
  readonly hungarianTranslation = linkedSignal(
    () => this.card()?.data.translation?.['hu']
  );
  readonly englishTranslation = linkedSignal(
    () => this.card()?.data.translation?.['en']
  );

  readonly images = linkedSignal(() => {
    return untracked(() => {
      if (!this.selectedCardId()) {
        return [];
      }

      const example = this.card()?.data.examples?.[0];
      return (
        example?.images?.map((image) => this.getExampleImageResource(image)) ??
        []
      );
    });
  });

  imageCarouselIndex = signal(0);

  readonly canMarkAsReviewed = computed(() => {
    if (this.card()?.readiness !== 'IN_REVIEW') {
      return false;
    }

    const currentImages = this.images();
    if (!currentImages || currentImages.length === 0) {
      return false;
    }

    return currentImages.some((imageResource) => {
      const imageValue = imageResource.value();
      return imageValue?.isFavorite === true;
    });
  });

  constructor() {
    effect(() => {
      const cardData = this.getCardData();
      if (cardData) {
        this.cardUpdate.emit(cardData);
      }
    });

    effect(() => {
      this.markAsReviewedAvailable.emit(this.canMarkAsReviewed());
    });
  }

  addImage() {
    const imageModels = this.environmentConfig.imageModels;
    this.images.update((imgs) => [
      ...imgs,
      ...imageModels.map((model) => this.createExampleImageResource(model.id)),
    ]);

    const length = this.images().length;
    this.imageCarouselIndex.set(length - 1);
  }

  areImagesLoading() {
    const imgs = this.images() || [];
    return imgs.some((image) => image.isLoading());
  }

  prevImage() {
    const imgs = this.images() || [];
    if (!imgs.length) return;
    this.imageCarouselIndex.update(
      (idx) => (idx - 1 + imgs.length) % imgs.length
    );
  }

  nextImage() {
    const imgs = this.images() || [];
    if (!imgs.length) return;
    this.imageCarouselIndex.update((idx) => (idx + 1) % imgs.length);
  }

  async toggleFavorite(imageIdx: number) {
    const imgs = this.images();
    if (!imgs?.length) return;

    const image = imgs[imageIdx];
    if (!image || image.isLoading()) return;

    const imageValue = image.value();
    if (!imageValue) return;

    image.set({
      ...imageValue,
      isFavorite: !imageValue.isFavorite,
    });

    this.images.update((currentImages) => [...currentImages]);
  }

  private getCardData():
    | Omit<
        Card,
        | 'due'
        | 'stability'
        | 'readiness'
        | 'difficulty'
        | 'elapsedDays'
        | 'scheduledDays'
        | 'learningSteps'
        | 'reps'
        | 'lapses'
        | 'state'
      >
    | undefined {
    const sourceId = this.selectedSourceId();
    const pageNumber = this.selectedPageNumber();
    const cardId = this.selectedCardId();
    const sentenceText = this.sentence();

    if (!cardId || !sentenceText || !sourceId || !pageNumber) {
      return;
    }

    const data: CardData = {
      word: sentenceText,
      translation: {
        hu: this.hungarianTranslation(),
        en: this.englishTranslation(),
      },
      examples: [
        {
          de: sentenceText,
          hu: this.hungarianTranslation(),
          en: this.englishTranslation(),
          isSelected: true,
          images: this.images()
            ?.map((image) => image.value())
            .filter((image) => image != null)
            .map(
              (image) =>
                ({
                  id: image.id,
                  model: image.model,
                  isFavorite: image.isFavorite,
                }) satisfies ExampleImage
            ),
        },
      ],
      audio: this.card()?.data.audio || [],
    };

    return {
      id: cardId,
      source: { id: sourceId },
      sourcePageNumber: pageNumber,
      data,
    };
  }

  private getExampleImageResource(image: ExampleImage) {
    return resource({
      injector: this.injector,
      loader: async () => {
        return { ...image, url: await this.getExampleImageUrl(image.id) };
      },
    });
  }

  private createExampleImageResource(model: string) {
    return resource({
      injector: this.injector,
      params: () => ({
        englishTranslation: this.englishTranslation(),
      }),
      loader: async ({ params: { englishTranslation } }) => {
        if (!englishTranslation) {
          return;
        }

        const response = await fetchJson<ExampleImage>(
          this.http,
          `/api/image`,
          {
            body: {
              input: englishTranslation,
              model,
            } satisfies ImageSourceRequest,
            method: 'POST',
          }
        );

        return {
          ...response,
          url: await this.getExampleImageUrl(response.id),
        };
      },
    });
  }

  private async getExampleImageUrl(imageId: string) {
    return await fetchAsset(
      this.http,
      `/api/image/${imageId}?width=600&height=600`
    );
  }
}
