import {
  Component,
  input,
  output,
  computed,
  inject,
  linkedSignal,
  untracked,
  effect,
  Injector,
  viewChild,
  afterNextRender,
  ElementRef,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { HttpClient } from '@angular/common/http';
import { resource } from '@angular/core';
import { Card, CardData, ExampleImage, Gap } from '../../types';
import { fetchAsset } from '../../../utils/fetchAsset';
import { fetchJson } from '../../../utils/fetchJson';
import { ENVIRONMENT_CONFIG } from '../../../environment/environment.config';
import { ImageSourceRequest } from '../../../shared/types/image-generation.types';
import { ImageCarouselComponent } from '../../../shared/image-carousel/image-carousel.component';

@Component({
  selector: 'app-edit-grammar-card',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatLabel,
    MatInputModule,
    MatButtonModule,
    MatIcon,
    MatProgressSpinnerModule,
    MatChipsModule,
    ImageCarouselComponent,
  ],
  templateUrl: './edit-grammar-card.component.html',
  styleUrl: './edit-grammar-card.component.css',
})
export class EditGrammarCardComponent {
  selectedCardId = input<string | undefined>();
  selectedSourceId = input<string | undefined>();
  selectedPageNumber = input<number | undefined>();
  card = input<Card | undefined>();
  cardUpdate = output<Partial<Card>>();
  markAsReviewedAvailable = output<boolean>();

  private readonly injector = inject(Injector);
  private readonly http = inject(HttpClient);
  private readonly environmentConfig = inject(ENVIRONMENT_CONFIG);
  private readonly imageCarousel = viewChild(ImageCarouselComponent);
  private readonly sentenceInput = viewChild<ElementRef<HTMLTextAreaElement>>('sentenceInput');

  readonly sentence = linkedSignal(() => this.card()?.data.examples?.[0]?.de);
  readonly englishTranslation = linkedSignal(
    () => this.card()?.data.examples?.[0]?.en
  );
  readonly gaps = linkedSignal(() => this.card()?.data.gaps ?? []);

  readonly gapsDisplay = computed(() => {
    const sentence = this.sentence() ?? '';
    const gapsList = this.gaps();
    return gapsList.map((gap) => ({
      ...gap,
      text: sentence.slice(gap.startIndex, gap.startIndex + gap.length),
    }));
  });

  readonly sentenceWithGaps = computed(() => {
    const sentence = this.sentence() ?? '';
    const gapsList = this.gaps();
    if (gapsList.length === 0) return sentence;

    const sortedGaps = [...gapsList].sort((a, b) => b.startIndex - a.startIndex);

    return sortedGaps.reduce(
      (result, gap) =>
        result.slice(0, gap.startIndex) +
        '_'.repeat(gap.length) +
        result.slice(gap.startIndex + gap.length),
      sentence
    );
  });

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

  addGapFromSelection() {
    const textarea = this.sentenceInput()?.nativeElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start === end) return;

    const newGap: Gap = {
      startIndex: start,
      length: end - start,
    };

    const currentGaps = this.gaps();
    const overlaps = currentGaps.some(
      (gap) =>
        (newGap.startIndex < gap.startIndex + gap.length &&
          newGap.startIndex + newGap.length > gap.startIndex)
    );

    if (overlaps) return;

    this.gaps.update((gaps) => [...gaps, newGap].sort((a, b) => a.startIndex - b.startIndex));
  }

  removeGap(index: number) {
    this.gaps.update((gaps) => gaps.filter((_, i) => i !== index));
  }

  addImage() {
    const imageModels = this.environmentConfig.imageModels;
    this.images.update((imgs) => [
      ...imgs,
      ...imageModels.map((model) => this.createExampleImageResource(model.id)),
    ]);
    afterNextRender(() => this.imageCarousel()?.goToLast(), {
      injector: this.injector,
    });
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
      gaps: this.gaps(),
      examples: [
        {
          de: sentenceText,
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
