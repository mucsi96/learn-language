import { computed, Injectable, resource, signal } from '@angular/core';
import { Translation, Word } from './parser/types';

@Injectable({
  providedIn: 'root',
})
export class WordService {
  private readonly selectedWord = signal<Word | undefined>(undefined);

  readonly hungarianTranslation = resource<
    Translation,
    { selectedWord: Word | undefined }
  >({
    request: () => ({ selectedWord: this.selectedWord() }),
    loader: async ({ request: { selectedWord } }) => {
      if (!selectedWord) {
        return;
      }

      const response = await fetch('/api/translate/hu', {
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

  readonly swissGermanTranslation = resource<
    Translation,
    { selectedWord: Word | undefined }
  >({
    request: () => ({ selectedWord: this.selectedWord() }),
    loader: async ({ request: { selectedWord } }) => {
      if (!selectedWord) {
        return;
      }

      const response = await fetch('/api/translate/ch', {
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

  readonly englishTranslation = resource<
    Translation,
    { selectedWord: Word | undefined }
  >({
    request: () => ({ selectedWord: this.selectedWord() }),
    loader: async ({ request: { selectedWord } }) => {
      if (!selectedWord) {
        return;
      }

      const response = await fetch('/api/translate/en', {
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
