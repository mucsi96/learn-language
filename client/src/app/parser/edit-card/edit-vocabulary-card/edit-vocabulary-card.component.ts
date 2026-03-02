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
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import { WORD_TYPE_TRANSLATIONS } from '../../../shared/word-type-translations';
import { GENDER_TRANSLATIONS } from '../../../shared/gender-translations';
import { Card, CardData } from '../../types';
import { languages } from '../../../shared/constants/languages';
import {
  ImageGridComponent,
  GridImageResource,
} from '../../../shared/image-grid/image-grid.component';
import { ImageResourceService } from '../../../shared/image-resource.service';
import { DailyUsageService } from '../../../daily-usage.service';
import { MultiModelService } from '../../../multi-model.service';
import { fetchJson } from '../../../utils/fetchJson';
import { nonNullable } from '../../../utils/type-guards';

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
    MatTooltipModule,
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
  saveRequested = output<void>();
  markAsReviewedAvailable = output<boolean>();

  private readonly http = inject(HttpClient);
  private readonly imageResourceService = inject(ImageResourceService);
  private readonly multiModelService = inject(MultiModelService);
  readonly dailyUsageService = inject(DailyUsageService);
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
  readonly exampleImages = linkedSignal<GridImageResource[][]>(() => {
    return untracked(() => {
      if (!this.selectedCardId()) {
        return [];
      }

      return (
        this.card()?.data.examples?.map(
          (example) =>
            example.images?.map((image) =>
              this.imageResourceService.createResource(image)
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

  async addImage(exampleIdx: number) {
    let englishTranslation = this.examplesTranslations()?.['en'][exampleIdx]();

    if (!englishTranslation) {
      const word = this.word();
      const germanExamples = this.examples()?.map((e) => e()).filter(nonNullable) ?? [];

      if (!word || germanExamples.length === 0) return;

      const result = await this.multiModelService.call<{
        translation: string;
        examples: string[];
      }>(
        'translation',
        (model: string, headers?: Record<string, string>) =>
          fetchJson(this.http, `/api/translate/en?model=${model}`, {
            body: { word, examples: germanExamples },
            method: 'POST',
            headers,
          })
      );

      englishTranslation = result.examples?.[exampleIdx];
      if (!englishTranslation) return;

      const examplesTranslations = this.examplesTranslations();
      if (examplesTranslations?.['en']?.[exampleIdx]) {
        examplesTranslations['en'][exampleIdx].set(englishTranslation);
      }
      if (result.translation && this.translation['en']) {
        this.translation['en'].set(result.translation);
      }
    }

    const { placeholders, done } =
      this.imageResourceService.generateImages(englishTranslation);

    this.exampleImages.update((images) => {
      images[exampleIdx] = [...images[exampleIdx], ...placeholders];
      return [...images];
    });

    await done;
    this.dailyUsageService.reload();

    const cardData = this.getCardData();
    if (cardData) {
      this.cardUpdate.emit(cardData);
    }
    this.saveRequested.emit();
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

    this.imageResourceService.toggleFavorite(image);
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
        images: this.imageResourceService.toExampleImages(
          this.exampleImages()[index] ?? []
        ),
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
}
