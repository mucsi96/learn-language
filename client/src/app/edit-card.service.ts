import { HttpClient } from '@angular/common/http';
import {
  computed,
  inject,
  Injectable,
  Injector,
  linkedSignal,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { Card, CardData, ExampleImage, Word } from './parser/types';
import { fetchAsset } from './utils/fetchAsset';
import { fetchJson } from './utils/fetchJson';
import { mapCardDatesFromISOStrings } from './utils/date-mapping.util';

export const languages = ['hu', 'ch', 'en'] as const;

@Injectable({
  providedIn: 'root',
})
export class EditCardService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  readonly selectedSourceId = signal<string | undefined>(undefined);
  readonly selectedPageNumber = signal<number | undefined>(undefined);
  readonly selectedWord = signal<Word | undefined>(undefined);
  readonly card = resource<
    Card | undefined,
    { selectedWord: Word | undefined }
  >({
    params: () => ({ selectedWord: this.selectedWord() }),
    loader: async ({ params: { selectedWord } }) => {
      if (!selectedWord || !selectedWord.exists) {
        return;
      }

      const card = await fetchJson<Card>(this.http, `/api/card/${selectedWord.id}`);
      return mapCardDatesFromISOStrings(card);
    },
  });
  readonly word = linkedSignal(
    () => this.card.value()?.data.word ?? this.selectedWord()?.word
  );
  readonly wordType = linkedSignal(() => this.card.value()?.data.type);
  readonly gender = linkedSignal(() => this.card.value()?.data.gender);
  readonly translation = Object.fromEntries(
    languages.map((languageCode) => [
      languageCode,
      linkedSignal(() => this.card.value()?.data.translation?.[languageCode]),
    ])
  );
  readonly forms = linkedSignal(() =>
    (this.card.value()?.data ?? this.selectedWord())?.forms?.map((form) =>
      signal(form)
    )
  );
  readonly examples = linkedSignal(() =>
    this.card.value()?.data.examples?.map((example) => signal(example['de']))
  );
  readonly examplesTranslations = linkedSignal(() => {
    const examples = this.examples();

    if (!examples) {
      return;
    }

    return Object.fromEntries(
      languages.map((languageCode) => [
        languageCode,
        examples.map((_, index) =>
          linkedSignal(
            () => this.card.value()?.data.examples?.[index][languageCode]
          )
        ),
      ])
    );
  });
  readonly exampleImages = linkedSignal(() => {
    const word = this.selectedWord();
    const card = this.card.value();

    return untracked(() => {
      if (!word) {
        return [];
      }

      return (
        card?.data.examples?.map(
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
      this.card
        .value()
        ?.data.examples?.findIndex((example) => example.isSelected) ?? 0
  );

  async selectWord(word: Word) {
    this.selectedWord.set(word);
  }

  addExampleImage(exampleIdx: number) {
    this.exampleImages.update((images) => {
      if (!images[exampleIdx]) {
        images[exampleIdx] = [];
      }
      images[exampleIdx].push(this.createExampleImageResource(exampleIdx));
      return images;
    });
    return this.exampleImages()[exampleIdx];
  }

  get isLoading() {
    return computed(() => this.card.isLoading());
  }

  getCardData():
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
    const word = this.selectedWord();
    const wordText = this.word();

    if (!word || !wordText || !sourceId || !pageNumber) {
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
      examples: this.examples()?.map((example, index) => ({
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
        images: this.exampleImages()[index]?.map((image) => image.value()),
      })),
      audio: this.card.value()?.data.audio || {},
    };

    return {
      id: word.id,
      source: { id: sourceId },
      sourcePageNumber: pageNumber,
      data,
    };
  }

  async updateCard() {
    const word = this.selectedWord();

    if (!word) {
      return;
    }

    await fetchJson(this.http, `/api/card/${word.id}`, {
      body: this.getCardData(),
      method: 'PUT',
    });
  }

  async markAsReviewed() {
    const word = this.selectedWord();

    if (!word) {
      return;
    }

    await fetchJson(this.http, `/api/card/${word.id}`, {
      body: { readiness: 'REVIEWED' },
      method: 'PUT',
    });
  }

  async deleteCard() {
    const word = this.selectedWord();

    if (!word) {
      return;
    }

    await fetchJson(this.http, `/api/card/${word.id}`, {
      method: 'DELETE',
    });
  }

  private getExampleImageResource(image: ExampleImage) {
    return resource({
      injector: this.injector,
      loader: async () => {
        return { ...image, url: await this.getExampleImageUrl(image.id) };
      },
    });
  }

  private createExampleImageResource(index: number) {
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
            },
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
