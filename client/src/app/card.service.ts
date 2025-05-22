import { HttpClient } from '@angular/common/http';
import {
  computed,
  inject,
  Injectable,
  Injector,
  linkedSignal,
  resource,
  ResourceRef,
  signal,
} from '@angular/core';
import { Card, Translation, Word } from './parser/types';
import { fetchJson } from './utils/fetchJson';

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
    request: () => ({ selectedWord: this.selectedWord() }),
    loader: async ({ request: { selectedWord } }) => {
      if (!selectedWord || !selectedWord.exists) {
        return;
      }

      return fetchJson<Card>(this.http, `/api/card/${selectedWord.id}`);
    },
  });
  readonly word = linkedSignal(
    () => this.card.value()?.word ?? this.selectedWord()?.word
  );
  readonly wordType = resource<
    string | undefined,
    { word?: Word; card?: Card }
  >({
    request: () => ({ word: this.selectedWord(), card: this.card.value() }),
    loader: async ({ request: { word, card } }) => {
      if (!word || (word.exists && !card)) {
        return;
      }

      if (card) {
        return card.type;
      }

      const { type } = await fetchJson<{ type: string }>(
        this.http,
        `/api/word-type`,
        {
          body: word,
          method: 'POST',
        }
      );
      return type;
    },
  });
  readonly translationMap = Object.fromEntries(
    languages.map((languageCode) => [
      languageCode,
      resource<Translation | undefined, { selectedWord?: Word; card?: Card }>({
        request: () => ({
          selectedWord: this.selectedWord(),
          card: this.card.value(),
        }),
        loader: async ({ request: { selectedWord, card } }) => {
          if (!selectedWord || (selectedWord.exists && !card)) {
            return;
          }

          if (card) {
            return {
              translation: card.translation?.[languageCode],
              examples: card.examples?.map((example) => example[languageCode]),
            };
          }

          return fetchJson<Translation>(
            this.http,
            `/api/translate/${languageCode}`,
            {
              body: selectedWord,
              method: 'POST',
            }
          );
        },
      }),
    ])
  );
  readonly translation = Object.fromEntries(
    languages.map((languageCode) => [
      languageCode,
      linkedSignal(
        () => this.translationMap[languageCode].value()?.translation
      ),
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
          linkedSignal(
            () => this.translationMap[languageCode].value()?.examples?.[index]
          )
        ),
      ])
    );
  });
  readonly exampleImages = signal<ResourceRef<string | undefined>[]>([]);
  private exampleImagesReload: boolean[] = [];
  readonly selectedExampleIndex = linkedSignal(
    () =>
      this.card.value()?.examples?.findIndex((example) => example.isSelected) ??
      0
  );

  async selectWord(word: Word) {
    this.selectedWord.set(word);
    this.exampleImagesReload = word.examples.map(() => false);
    this.exampleImages.set(
      word.examples.map((_, index) =>
        resource<
          string | undefined,
          {
            card?: Card;
            englishTranslation?: string;
            selectedSourceId?: string;
          }
        >({
          injector: this.injector,
          request: () => ({
            card: this.card.value(),
            englishTranslation: this.examplesTranslations()?.['en'][index](),
            selectedSourceId: this.selectedSourceId(),
          }),
          loader: async ({
            request: { card, englishTranslation, selectedSourceId },
          }) => {
            if (
              !englishTranslation ||
              (word.exists && !card) ||
              !selectedSourceId
            ) {
              return;
            }

            const imageUrl =
              word.exists &&
              !this.exampleImagesReload[index] &&
              this.getImageUrl(index);

            if (imageUrl) {
              const { url } = await fetchJson<{ url: string }>(
                this.http,
                imageUrl
              );
              this.exampleImagesReload[index] = true;
              return url;
            }

            const { url } = await fetchJson<{ url: string }>(
              this.http,
              `/api/image/${selectedSourceId}`,
              {
                body: {
                  id: word.id,
                  input: englishTranslation,
                  index,
                  override: this.exampleImagesReload[index],
                },
                method: 'POST',
              }
            );
            this.exampleImagesReload[index] = true;
            return url;
          },
        })
      )
    );
  }

  get isLoading() {
    return computed(
      () =>
        this.card.isLoading() ||
        Object.values(this.translationMap).some((translation) =>
          translation.isLoading()
        )
    );
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
      type: this.wordType.value(),
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
        })
      })),
    } satisfies Card;
    return cardData;
  }

  async createCard() {
    await fetchJson(this.http, `/api/card`, {
      body: this.getCardData(),
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

  getImageUrl = (index: number) => {
    const word = this.selectedWord();

    if (!word) {
      return;
    }

    return `/api/image/${this.selectedSourceId()}/${word.id}-${index}`;
  };
}
