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
import {
  ImageGridComponent,
  GridImageResource,
  GridImageValue,
} from '../../../shared/image-grid/image-grid.component';

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
    ImageGridComponent,
  ],
  templateUrl: './edit-speech-card.component.html',
  styleUrl: './edit-speech-card.component.css',
})
export class EditSpeechCardComponent {
  selectedCardId = input<string | undefined>();
  selectedSourceId = input<string | undefined>();
  selectedPageNumber = input<number | undefined>();
  card = input<Card | undefined>();
  cardUpdate = output<Partial<Card>>();
  saveRequested = output<void>();
  markAsReviewedAvailable = output<boolean>();

  private readonly injector = inject(Injector);
  private readonly http = inject(HttpClient);
  private readonly environmentConfig = inject(ENVIRONMENT_CONFIG);
  readonly sentence = linkedSignal(() => this.card()?.data.examples?.[0]?.de);
  readonly hungarianTranslation = linkedSignal(
    () => this.card()?.data.examples?.[0]?.hu
  );
  readonly englishTranslation = linkedSignal(
    () => this.card()?.data.examples?.[0]?.en
  );

  readonly images = linkedSignal<GridImageResource[]>(() => {
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

  async addImage() {
    const imageModels = this.environmentConfig.imageModels;
    const englishTranslation = this.englishTranslation();
    if (!englishTranslation) return;

    const allPlaceholders = imageModels.flatMap((model) =>
      Array.from({ length: model.imageCount }, () =>
        this.createPendingImageResource(model.displayName)
      )
    );

    this.images.update((imgs) => [
      ...imgs,
      ...allPlaceholders.map((p) => p.gridResource),
    ]);

    let placeholderOffset = 0;
    await Promise.all(
      imageModels.map(async (model) => {
        const startIdx = placeholderOffset;
        placeholderOffset += model.imageCount;

        const responses = await fetchJson<ExampleImage[]>(
          this.http,
          `/api/image`,
          {
            body: {
              input: englishTranslation,
              model: model.id,
            } satisfies ImageSourceRequest,
            method: 'POST',
          }
        );

        await Promise.all(
          responses.map((response, i) =>
            allPlaceholders[startIdx + i].resolve(response)
          )
        );
      })
    );

    const cardData = this.getCardData();
    if (cardData) {
      this.cardUpdate.emit(cardData);
    }
    this.saveRequested.emit();
  }

  areImagesLoading() {
    const imgs = this.images() || [];
    return imgs.some((image) => image.isLoading());
  }

  onFavoriteToggled(imageIdx: number) {
    const imgs = this.images();
    if (!imgs?.length) return;

    const image = imgs[imageIdx];
    if (!image || image.isLoading()) return;

    const imageValue = image.value();
    if (!imageValue) return;

    (image as any).set({
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
      examples: [
        {
          de: sentenceText,
          hu: this.hungarianTranslation(),
          en: this.englishTranslation(),
          isSelected: true,
          images: this.images()
            ?.map((image) => image.value())
            .filter(
              (image): image is GridImageValue & { id: string } =>
                image != null && !!image.id
            )
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

  private createPendingImageResource(modelDisplayName: string) {
    const isLoading = signal(true);
    const value = signal<GridImageValue | undefined>({ model: modelDisplayName });

    const gridResource: GridImageResource = {
      isLoading: isLoading.asReadonly(),
      value: value.asReadonly(),
    };

    const resolve = async (image: ExampleImage) => {
      const url = await this.getExampleImageUrl(image.id);
      value.set({ ...image, url });
      isLoading.set(false);
    };

    return { gridResource, resolve };
  }

  private getExampleImageResource(image: ExampleImage): GridImageResource {
    return resource({
      injector: this.injector,
      loader: async () => {
        return { ...image, url: await this.getExampleImageUrl(image.id) };
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
