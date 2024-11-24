import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, resource, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ImageSource, Translation, Word } from './parser/types';
import { fetchJson } from './utils/fetchJson';

export const languages = ['hu', 'ch', 'en'] as const;

@Injectable({
  providedIn: 'root',
})
export class WordService {
  private readonly selectedWord = signal<Word | undefined>(undefined);
  private readonly http = inject(HttpClient);

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

  async selectWord(word: Word) {
    this.selectedWord.set(word);
    this.createImage({
      id: word.id,
      input: word.examples[0],
      index: 0,
    });

    await firstValueFrom(
      this.http.get(
        'https://ibari.blob.core.windows.net/learn-german/anfangen-0.png',
        {
          headers: {
            'x-ms-version': '2025-01-05',
          },
        }
      )
    );
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
