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
  readonly selectedWord = signal<Word | undefined>(undefined);
  private readonly http = inject(HttpClient);

  readonly translation = Object.fromEntries(
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

  async selectWord(word: Word) {
    this.selectedWord.set(word);
  }

  get isLoading() {
    return computed(() =>
      Object.values(this.translation).some((translation) =>
        translation.isLoading()
      )
    );
  }

  async getImageBlobUrl(imageUrl: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.get(imageUrl, { responseType: 'blob' })
    );
    return URL.createObjectURL(response);
  }

  createImage(imageSource: ImageSource) {
    return fetchJson(this.http, `/api/image`, {
      body: imageSource,
      method: 'POST',
    });
  }
}
