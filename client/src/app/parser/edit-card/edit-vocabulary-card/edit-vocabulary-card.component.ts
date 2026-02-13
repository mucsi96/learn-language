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
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { resource } from '@angular/core';
import { WORD_TYPE_TRANSLATIONS } from '../../../shared/word-type-translations';
import { GENDER_TRANSLATIONS } from '../../../shared/gender-translations';
import { Card, CardData, ExampleImage } from '../../types';
import { fetchAsset } from '../../../utils/fetchAsset';
import { fetchJson } from '../../../utils/fetchJson';
import { languages } from '../../../shared/constants/languages';
import { ENVIRONMENT_CONFIG } from '../../../environment/environment.config';
import { ImageSourceRequest } from '../../../shared/types/image-generation.types';
import { ImageGridComponent } from '../../../shared/image-grid/image-grid.component';

@Component({
  selector: 'app-edit-vocabulary-card',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatLabel,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    MatButtonModule,
    MatIcon,
    MatProgressSpinnerModule,
    ImageGridComponent,
  ],
  templateUrl: './edit-vocabulary-card.component.html',
  styleUrl: './edit-vocabulary-card.component.css',
})
export class EditVocabularyCardComponent {
  selectedCardId = input<string | undefined>();
  selectedSourceId = input<string | undefined>();
  selectedPageNumber = input<number | undefined>();
  card = input<Card | undefined>();
  cardUpdate = output<any>();
  markAsReviewedAvailable = output<boolean>();

  private readonly injector = inject(Injector);
  private readonly http = inject(HttpClient);
  private readonly environmentConfig = inject(ENVIRONMENT_CONFIG);
  readonly wordTypeOptions = WORD_TYPE_TRANSLATIONS;
  readonly genderOptions = GENDER_TRANSLATIONS;

  readonly word = linkedSignal(() => this.card()?.data.word);
  readonly wordType = linkedSignal(() => this.card()?.data.type);
  readonly gender = linkedSignal(() => this.card()?.data.gender);
  readonly translation = Object.fromEntries(
    languages.map((languageCode) => [
      languageCode,
      linkedSignal(() => this.card()?.data.translation?.[languageCode]),
    ])
  );
  readonly forms = linkedSignal(() =>
    this.card()?.data.forms?.map((form: string) => signal(form))
  );
  readonly examples = linkedSignal(() =>
    this.card()?.data.examples?.map((example) => signal(example['de']))
  );
  readonly examplesTranslations = linkedSignal(() => {
    const examples = this.examples();

    if (!examples) {
      return;
    }

    return Object.fromEntries(
      languages.map((languageCode) => [
        languageCode,
        examples.map((_, index: number) =>
          linkedSignal(() => this.card()?.data.examples?.[index][languageCode])
        ),
      ])
    );
  });
  readonly exampleImages = linkedSignal(() => {
    return untracked(() => {
      if (!this.selectedCardId()) {
        return [];
      }

      return (
        this.card()?.data.examples?.map(
          (example) =>
            example.images?.map((image) =>
              this.getExampleImageResource(image)
            ) ?? []
        ) ?? []
      );
    });
  });
  readonly selectedExampleIndex = linkedSignal(
    () =>
      this.card()?.data.examples?.findIndex((example) => example.isSelected) ??
      0
  );

  readonly canMarkAsReviewed = computed(() => {
    if (this.card()?.readiness !== 'IN_REVIEW') {
      return false;
    }

    const selectedExampleIndex = this.selectedExampleIndex();
    const examples = this.examples();

    if (
      !examples ||
      selectedExampleIndex < 0 ||
      selectedExampleIndex >= examples.length
    ) {
      return false;
    }

    const exampleImages = this.exampleImages();
    const selectedExampleImages = exampleImages?.[selectedExampleIndex];

    if (!selectedExampleImages || selectedExampleImages.length === 0) {
      return false;
    }

    return selectedExampleImages.some((imageResource) => {
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

  addImage(exampleIdx: number) {
    const imageModels = this.environmentConfig.imageModels;
    this.exampleImages.update((images) => {
      images[exampleIdx] = [
        ...images[exampleIdx],
        ...imageModels.map((model) =>
          this.createExampleImageResource(exampleIdx, model.id)
        ),
      ];
      return images;
    });
  }

  areImagesLoading(exampleIdx: number) {
    const images = this.exampleImages()?.[exampleIdx] || [];
    return images.some((image) => image.isLoading());
  }

  onFavoriteToggled(exampleIdx: number, imageIdx: number) {
    const images = this.exampleImages()?.[exampleIdx];
    if (!images?.length) return;

    const image = images[imageIdx];
    if (!image || image.isLoading()) return;

    const imageValue = image.value();
    if (!imageValue) return;

    image.set({
      ...imageValue,
      isFavorite: !imageValue.isFavorite,
    });

    this.exampleImages.update((currentImages) => [...currentImages]);
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
    const wordText = this.word();

    if (!cardId || !wordText || !sourceId || !pageNumber) {
      return;
    }

    const data: CardData = {
      word: wordText,
      type: this.wordType(),
      gender: this.gender(),
      translation: Object.fromEntries(
        languages.map((languageCode) => [
          languageCode,
          this.translation[languageCode](),
        ])
      ),
      forms: this.forms()?.map((form) => form()),
      examples: this.examples()?.map((example, index: number) => ({
        ...Object.fromEntries([
          ['de', example()],
          ...languages.map((languageCode) => [
            languageCode,
            this.examplesTranslations()?.[languageCode][index](),
          ]),
        ]),
        ...(this.selectedExampleIndex() === index && {
          isSelected: true,
        }),
        images: this.exampleImages()
          [index]?.map((image) => image.value())
          .filter((image) => image != null)
          .map((image) => ({ id: image.id, model: image.model, isFavorite: image.isFavorite } satisfies ExampleImage))
      })),
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

  private createExampleImageResource(index: number, model: string) {
    return resource({
      injector: this.injector,
      params: () => ({
        englishTranslation: this.examplesTranslations()?.['en'][index](),
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
