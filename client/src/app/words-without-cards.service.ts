import { Injectable, inject, computed } from '@angular/core';
import { PageService } from './page.service';
import { Word } from './parser/types';

@Injectable({
  providedIn: 'root',
})
export class WordsWithoutCardsService {
  private readonly pageService = inject(PageService);

  readonly wordsWithoutCards = computed(() => {
    const selectionRegions = this.pageService.selectionRegions();

    if (!selectionRegions || selectionRegions.length === 0) {
      return [];
    }

    const allWordsWithoutCards: Word[] = [];

    for (const region of selectionRegions) {
      const wordList = region.value();
      if (wordList?.words) {
        const wordsWithoutCardsInRegion = wordList.words.filter(word => !word.exists);
        allWordsWithoutCards.push(...wordsWithoutCardsInRegion);
      }
    }

    console.log('All words without cards:', allWordsWithoutCards);
    debugger;

    // Remove duplicates based on word ID
    const uniqueWords = allWordsWithoutCards.filter((word, index, array) =>
      array.findIndex(w => w.id === word.id) === index
    );

    return uniqueWords;
  });

  readonly hasWordsWithoutCards = computed(() => this.wordsWithoutCards().length > 0);
  readonly wordsWithoutCardsCount = computed(() => this.wordsWithoutCards().length);
}
