import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from './utils/fetchJson';
import { Card } from './parser/types';
import { BackendCard } from './in-review-cards/in-review-cards.component';

export interface AudioCreationProgress {
  cardId: string;
  cardWord: string;
  status: 'pending' | 'generating-word-audio' | 'generating-translation-audio' | 'generating-example-audio' | 'updating-card' | 'completed' | 'error';
  progress: number; // 0-100
  error?: string;
  currentStep?: string;
}

export interface BatchAudioCreationResult {
  totalCards: number;
  successfulCards: number;
  failedCards: number;
  errors: string[];
}

@Injectable({
  providedIn: 'root',
})
export class BatchAudioCreationService {
  private readonly http = inject(HttpClient);

  readonly creationProgress = signal<AudioCreationProgress[]>([]);
  readonly isCreating = signal(false);

  readonly totalProgress = computed(() => {
    const progress = this.creationProgress();
    if (progress.length === 0) return 0;

    const totalProgress = progress.reduce((sum, card) => sum + card.progress, 0);
    return totalProgress / progress.length;
  });

  async createAudioInBatch(
    cards: BackendCard[]
  ): Promise<BatchAudioCreationResult> {
    if (this.isCreating()) {
      throw new Error('Batch audio creation already in progress');
    }

    if (cards.length === 0) {
      return {
        totalCards: 0,
        successfulCards: 0,
        failedCards: 0,
        errors: []
      };
    }

    this.isCreating.set(true);

    // Initialize progress tracking
    const initialProgress: AudioCreationProgress[] = cards.map(card => ({
      cardId: card.id,
      cardWord: card.data.word || card.id,
      status: 'pending',
      progress: 0,
      currentStep: 'Queued for processing'
    }));

    this.creationProgress.set(initialProgress);

    const results = await Promise.allSettled(
      cards.map((card, index) =>
        this.createAudioForSingleCard(card, index)
      )
    );

    this.isCreating.set(false);

    const successfulCards = results.filter(result => result.status === 'fulfilled').length;
    const failedCards = results.filter(result => result.status === 'rejected').length;
    const errors = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => result.reason?.message || 'Unknown error');

    return {
      totalCards: cards.length,
      successfulCards,
      failedCards,
      errors
    };
  }

  private async createAudioForSingleCard(
    card: BackendCard,
    progressIndex: number
  ): Promise<void> {
    const audioMap = card.data.audio || {};

    try {
      // Step 1: Generate audio for the German word (25% progress)
      this.updateProgress(progressIndex, 'generating-word-audio', 25, 'Generating audio for German word...');
      if (card.data.word) {
        const wordAudioResponse = await fetchJson<{ id: string }>(
          this.http,
          `/api/audio`,
          {
            body: { input: card.data.word },
            method: 'POST',
          }
        );
        audioMap[card.data.word] = wordAudioResponse.id;
      }

      // Step 2: Generate audio for Hungarian translation (50% progress)
      this.updateProgress(progressIndex, 'generating-translation-audio', 50, 'Generating audio for translation...');
      if (card.data.translation?.['hu']) {
        const translationAudioResponse = await fetchJson<{ id: string }>(
          this.http,
          `/api/audio`,
          {
            body: { input: card.data.translation['hu'] },
            method: 'POST',
          }
        );
        audioMap[card.data.translation['hu']] = translationAudioResponse.id;
      }

      // Step 3: Generate audio for selected example and its translation (75% progress)
      this.updateProgress(progressIndex, 'generating-example-audio', 75, 'Generating audio for examples...');
      const selectedExample = card.data.examples?.find((example: any) => example.isSelected);
      if (selectedExample) {
        // German example
        if (selectedExample.de) {
          const exampleAudioResponse = await fetchJson<{ id: string }>(
            this.http,
            `/api/audio`,
            {
              body: { input: selectedExample.de },
              method: 'POST',
            }
          );
          audioMap[selectedExample.de] = exampleAudioResponse.id;
        }

        // Hungarian example translation
        if (selectedExample.hu) {
          const exampleTranslationAudioResponse = await fetchJson<{ id: string }>(
            this.http,
            `/api/audio`,
            {
              body: { input: selectedExample.hu },
              method: 'POST',
            }
          );
          audioMap[selectedExample.hu] = exampleTranslationAudioResponse.id;
        }
      }

      // Step 4: Update card with audio IDs (90% progress)
      this.updateProgress(progressIndex, 'updating-card', 90, 'Updating card with audio data...');

      // Create the updated card data by merging existing data with new audio
      const updatedCardData = {
        ...card.data,
        audio: audioMap
      };

      // Update the card
      await fetchJson(this.http, `/api/card/${card.id}`, {
        body: updatedCardData,
        method: 'PUT',
      });

      // Step 5: Set card readiness to ready (95% progress)
      this.updateProgress(progressIndex, 'updating-card', 95, 'Setting card readiness to ready...');

      await fetchJson(this.http, `/api/card/${card.id}/readiness/READY`, {
        method: 'POST',
      });

      // Step 6: Complete (100% progress)
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
    status: AudioCreationProgress['status'],
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
