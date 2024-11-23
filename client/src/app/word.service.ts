import { computed, Injectable, resource, signal } from '@angular/core';
import { Translation, Word } from './parser/types';

@Injectable({
  providedIn: 'root',
})
export class WordService {
  private readonly selectedWord = signal<Word | undefined>(undefined);

  private createTranslationResource(languageCode: string) {
    return resource<Translation, { selectedWord: Word | undefined }>({
      request: () => ({ selectedWord: this.selectedWord() }),
      loader: async ({ request: { selectedWord } }) => {
        if (!selectedWord) {
          return;
        }

        const response = await fetch(`/api/translate/${languageCode}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(selectedWord),
        });

        if (!response.ok) {
          throw new Error('Could not load word');
        }

        return response.json();
      },
    });
  }

  readonly hungarianTranslation = this.createTranslationResource('hu');
  readonly swissGermanTranslation = this.createTranslationResource('ch');
  readonly englishTranslation = this.createTranslationResource('en');

  selectWord(word: Word) {
    this.selectedWord.set(word);
  }

  get isLoading() {
    return computed(
      () =>
        this.hungarianTranslation.isLoading() ||
        this.swissGermanTranslation.isLoading() ||
        this.englishTranslation.isLoading()
    );
  }
}
