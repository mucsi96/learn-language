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
import { createEmptyCard } from 'ts-fsrs';
import { Card, ExampleImage, Word } from './parser/types';
import { fetchAsset } from './utils/fetchAsset';
import { fetchJson } from './utils/fetchJson';
import { mapTsfsrsStateToCardState } from './shared/state/card-state';

export const languages = ['hu', 'ch', 'en'] as const;

@Injectable({
  providedIn: 'root',
})
export class CardService {
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

      return fetchJson<Card>(this.http, `/api/card/${selectedWord.id}`);
    },
  });
  readonly word = linkedSignal(
    () => this.card.value()?.word ?? this.selectedWord()?.word
  );
  readonly wordType = linkedSignal(() => this.card.value()?.type);
  readonly gender = linkedSignal(() => this.card.value()?.gender);
  readonly translation = Object.fromEntries(
    languages.map((languageCode) => [
      languageCode,
      linkedSignal(() => this.card.value()?.translation?.[languageCode]),
    ])
  );
  readonly forms = linkedSignal(() =>
    (this.card.value() ?? this.selectedWord())?.forms?.map((form) =>
      signal(form)
    )
  );
  readonly examples = linkedSignal(
    () =>
      this.card.value()?.examples?.map((example) => signal(example['de'])) ??
      this.selectedWord()?.examples.map((example) => signal(example))
  );
  readonly examplesTranslations = linkedSignal(() => {
    const examples = this.selectedWord()?.examples;

    if (!examples) {
      return;
    }

    return Object.fromEntries(
      languages.map((languageCode) => [
        languageCode,
        examples.map((_, index) =>
          linkedSignal(() => this.card.value()?.examples?.[index][languageCode])
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
        card?.examples?.map(
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
      this.card.value()?.examples?.findIndex((example) => example.isSelected) ??
      0
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

  getCardData() {
    const sourceId = this.selectedSourceId();
    const pageNumber = this.selectedPageNumber();
    const word = this.selectedWord();
    const wordText = this.word();

    if (!word || !wordText || !sourceId || !pageNumber) {
      return;
    }

    const cardData = {
      id: word.id,
      sourceId,
      pageNumber,
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
    } satisfies Card;
    return cardData;
  }

  async createCard() {
    const cardData = this.getCardData();
    const fsrsCardData = createEmptyCard();
    if (!cardData) return;

    const cardWithFSRS = {
      ...cardData,
      ...fsrsCardData,
      state: mapTsfsrsStateToCardState(fsrsCardData.state),
      due: fsrsCardData.due.toISOString(),
      last_review: fsrsCardData.last_review?.toISOString(),
    };

    await fetchJson(this.http, `/api/card`, {
      body: cardWithFSRS,
      method: 'POST',
    });
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
