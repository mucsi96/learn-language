import { computed, Injectable, resource, signal } from '@angular/core';
import { ImageSource, Translation, Word } from './parser/types';
import { fetchJson } from './utils/fetchJson';

export const languages = ['hu', 'ch', 'en'] as const;

@Injectable({
  providedIn: 'root',
})
export class WordService {
  private readonly selectedWord = signal<Word | undefined>(undefined);

  readonly translation = Object.fromEntries(
    languages.map((languageCode) => [
      languageCode,
      resource<Translation, { selectedWord: Word | undefined }>({
        request: () => ({ selectedWord: this.selectedWord() }),
        loader: async ({ request: { selectedWord } }) => {
          if (!selectedWord) {
            return;
          }

          return fetchJson(`/api/translate/${languageCode}`, {
            body: selectedWord,
            method: 'POST',
          });
        },
      }),
    ])
  );

  selectWord(word: Word) {
    this.selectedWord.set(word);
    this.createImage({
      id: word.id,
      input: word.examples[0],
      index: 0,
    });
  }

  get isLoading() {
    return computed(() =>
      Object.values(this.translation).some((translation) =>
        translation.isLoading()
      )
    );
  }

  createImage(imageSource: ImageSource) {
    return fetchJson(`/api/image`, {
      body: imageSource,
      method: 'POST',
    });
  }
}
