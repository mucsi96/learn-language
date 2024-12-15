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
import { Translation, Word } from './parser/types';
import { fetchJson } from './utils/fetchJson';

export const languages = ['hu', 'ch', 'en'] as const;

@Injectable({
  providedIn: 'root',
})
export class CardService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  readonly selectedWord = signal<Word | undefined>(undefined);
  readonly word = linkedSignal(() => this.selectedWord()?.word);
  readonly wordType = resource<string | undefined, { word?: Word }>({
    request: () => ({ word: this.selectedWord() }),
    loader: async ({ request: { word } }) => {
      if (!word) {
        return;
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
      resource<Translation | undefined, { selectedWord: Word | undefined }>({
        request: () => ({ selectedWord: this.selectedWord() }),
        loader: async ({ request: { selectedWord } }) => {
          if (!selectedWord) {
            return;
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
    this.selectedWord()?.forms.map((form) => signal(form))
  );
  readonly examples = linkedSignal(() =>
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
            () => this.translationMap[languageCode].value()?.examples[index]
          )
        ),
      ])
    );
  });
  readonly exampleImages = signal<ResourceRef<string | undefined>[]>([]);
  private exampleImagesReload: boolean[] = [];

  async selectWord(word: Word) {
    this.selectedWord.set(word);
    this.exampleImagesReload = word.examples.map(() => false);
    this.exampleImages.set(
      word.examples.map((_, index) =>
        resource<string | undefined, { englishTranslation?: string }>({
          injector: this.injector,
          request: () => ({
            englishTranslation: this.examplesTranslations()?.['en'][index](),
          }),
          loader: async ({ request: { englishTranslation } }) => {
            if (!englishTranslation) {
              return;
            }
            const { url } = await fetchJson<{ url: string }>(
              this.http,
              `/api/image`,
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
    return computed(() =>
      Object.values(this.translationMap).some((translation) =>
        translation.isLoading()
      )
    );
  }

  async createCard() {
    const word = this.selectedWord();
    if (!word) {
      return;
    }

    const cardData = {
      id: word.id,
      word: word.word,
      type: this.wordType.value(),
      translation: Object.fromEntries(
        languages.map((languageCode) => [
          languageCode,
          this.translation[languageCode](),
        ])
      ),
      forms: this.forms()?.map((form) => form()),
      examples: this.examples()?.map((example, index) => {
        return Object.fromEntries([
          ['de', example()],
          ...languages.map((languageCode) => [
            languageCode,
            this.examplesTranslations()?.[languageCode][index](),
          ]),
        ]);
      }),
    };

    await fetchJson(this.http, `/api/card`, {
      body: cardData,
      method: 'POST',
    });
  }
}
