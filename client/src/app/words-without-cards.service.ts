import { Injectable, inject, computed, signal } from '@angular/core';
import { PageService } from './page.service';
import { Word } from './parser/types';

@Injectable({
  providedIn: 'root',
})
export class WordsWithoutCardsService {
  private readonly pageService = inject(PageService);
  private readonly ignoredWordIds = signal<Set<string>>(new Set());

  readonly allExtractedWords = computed(() => {
    const selectionRegions = this.pageService.selectionRegions();

    if (!selectionRegions || selectionRegions.length === 0) {
      return [];
    }

    const allWords: Word[] = [];

    for (const region of selectionRegions) {
      const wordList = region.value();
      if (wordList?.words) {
        allWords.push(...wordList.words);
      }
    }

    const uniqueWords = allWords.filter((word, index, array) =>
      array.findIndex(w => w.id === word.id) === index
    );

    return uniqueWords;
  });

  readonly wordsWithoutCards = computed(() => {
    const ignored = this.ignoredWordIds();
    return this.allExtractedWords()
      .filter(word => !word.exists)
      .filter(word => !ignored.has(word.id));
  });

  readonly hasWordsWithoutCards = computed(() => this.wordsWithoutCards().length > 0);
  readonly wordsWithoutCardsCount = computed(() => this.wordsWithoutCards().length);

  ignoreWord(wordId: string): void {
    this.ignoredWordIds.update(ids => {
      const newIds = new Set(ids);
      newIds.add(wordId);
      return newIds;
    });
  }

  clearIgnoredWords(): void {
    this.ignoredWordIds.set(new Set());
  }
}
