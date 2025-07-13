import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Word } from './parser/types';
import { fetchJson } from './utils/fetchJson';
import { createEmptyCard } from 'ts-fsrs';
import { languages } from './card.service';
import { mapTsfsrsStateToCardState } from './shared/state/card-state';

export interface CardCreationProgress {
  word: string;
  status: 'pending' | 'word-type' | 'translating' | 'generating-images' | 'creating-card' | 'completed' | 'error';
  progress: number; // 0-100
  error?: string;
  currentStep?: string;
}

export interface BulkCardCreationResult {
  totalCards: number;
  successfulCards: number;
  failedCards: number;
  errors: string[];
}

@Injectable({
  providedIn: 'root',
})
export class BulkCardCreationService {
  private readonly http = inject(HttpClient);

  readonly creationProgress = signal<CardCreationProgress[]>([]);
  readonly isCreating = signal(false);

  readonly totalProgress = computed(() => {
    const progress = this.creationProgress();
    if (progress.length === 0) return 0;

    const totalProgress = progress.reduce((sum, card) => sum + card.progress, 0);
    return totalProgress / progress.length;
  });

  async createCardsInBulk(
    words: Word[],
    sourceId: string,
    pageNumber: number
  ): Promise<BulkCardCreationResult> {
    if (this.isCreating()) {
      throw new Error('Bulk creation already in progress');
    }

    // Filter out words that already have cards
    const wordsToCreate = words.filter(word => !word.exists);

    if (wordsToCreate.length === 0) {
      return {
        totalCards: 0,
        successfulCards: 0,
        failedCards: 0,
        errors: []
      };
    }

    this.isCreating.set(true);

    // Initialize progress tracking
    const initialProgress: CardCreationProgress[] = wordsToCreate.map(word => ({
      word: word.word,
      status: 'pending',
      progress: 0,
      currentStep: 'Queued for processing'
    }));

    this.creationProgress.set(initialProgress);

    const results = await Promise.allSettled(
      wordsToCreate.map((word, index) =>
        this.createSingleCard(word, sourceId, pageNumber, index)
      )
    );

    this.isCreating.set(false);

    const successfulCards = results.filter(result => result.status === 'fulfilled').length;
    const failedCards = results.filter(result => result.status === 'rejected').length;
    const errors = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => result.reason?.message || 'Unknown error');

    return {
      totalCards: wordsToCreate.length,
      successfulCards,
      failedCards,
      errors
    };
  }

  private async createSingleCard(
    word: Word,
    sourceId: string,
    pageNumber: number,
    progressIndex: number
  ): Promise<void> {
    try {
      // Step 1: Get word type (20% progress)
      this.updateProgress(progressIndex, 'word-type', 20, 'Detecting word type...');
      const wordTypeResponse = await fetchJson<{ type: string }>(
        this.http,
        `/api/word-type`,
        {
          body: { word: word.word },
          method: 'POST',
        }
      );

      // Step 2: Get translations (40% progress)
      this.updateProgress(progressIndex, 'translating', 40, 'Translating to multiple languages...');
      const translationPromises = languages.map(async (languageCode) => {
        const translation = await fetchJson<{ translation: string; examples: string[] }>(
          this.http,
          `/api/translate/${languageCode}`,
          {
            body: word,
            method: 'POST',
          }
        );
        return { languageCode, translation };
      });

      const translations = await Promise.all(translationPromises);
      const translationMap = Object.fromEntries(
        translations.map(({ languageCode, translation }) => [
          languageCode,
          translation.translation
        ])
      );
      const exampleTranslations = Object.fromEntries(
        translations.map(({ languageCode, translation }) => [
          languageCode,
          translation.examples || []
        ])
      );

      // Step 3: Generate images for examples (70% progress)
      this.updateProgress(progressIndex, 'generating-images', 70, 'Generating example images...');
      const exampleImages = await Promise.all(
        word.examples.map(async (example, exampleIndex) => {
          // Use English translation for image generation
          const englishTranslation = exampleTranslations['en']?.[exampleIndex];
          if (!englishTranslation) {
            return [];
          }

          const imageResponse = await fetchJson<{ id: string }>(
            this.http,
            `/api/image`,
            {
              body: { input: englishTranslation },
              method: 'POST',
            }
          );

          return [{ id: imageResponse.id }];
        })
      );

      // Step 4: Create card (90% progress)
      this.updateProgress(progressIndex, 'creating-card', 90, 'Creating card...');
      const cardData = {
        id: word.id,
        sourceId,
        pageNumber,
        word: word.word,
        type: wordTypeResponse.type,
        translation: translationMap,
        forms: word.forms,
        examples: word.examples.map((example, index) => ({
          de: example,
          ...Object.fromEntries(
            languages.map((languageCode) => [
              languageCode,
              exampleTranslations[languageCode]?.[index] || ''
            ])
          ),
          isSelected: index === 0, // First example is selected by default
          images: exampleImages[index] || []
        }))
      };

      const emptyCard = createEmptyCard();
      const cardWithFSRS = {
        ...cardData,
        ...emptyCard,
        state: mapTsfsrsStateToCardState(emptyCard.state),
      };

      await fetchJson(this.http, `/api/card`, {
        body: cardWithFSRS,
        method: 'POST',
      });

      // Step 5: Complete (100% progress)
      this.updateProgress(progressIndex, 'completed', 100);

    } catch (error) {
      this.updateProgress(
        progressIndex,
        'error',
        0,
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw error;
    }
  }

  private updateProgress(
    index: number,
    status: CardCreationProgress['status'],
    progress: number,
    currentStep?: string
  ): void {
    this.creationProgress.update(progressList => {
      const newProgress = [...progressList];
      if (newProgress[index]) {
        newProgress[index] = {
          ...newProgress[index],
          status,
          progress,
          currentStep
        };
      }
      return newProgress;
    });
  }

  clearProgress(): void {
    this.creationProgress.set([]);
  }
}
