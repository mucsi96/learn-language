import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from './utils/fetchJson';
import { BackendCard } from './in-review-cards/in-review-cards.component';
import { ReadinessService } from './readiness.service';

export interface AudioCreationProgress {
  cardId: string;
  cardWord: string;
  status:
    | 'pending'
    | 'generating-word-audio'
    | 'generating-translation-audio'
    | 'generating-example-audio'
    | 'updating-card'
    | 'completed'
    | 'error';
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
  private readonly readinessService = inject(ReadinessService);

  readonly creationProgress = signal<AudioCreationProgress[]>([]);
  readonly isCreating = signal(false);

  readonly totalProgress = computed(() => {
    const progress = this.creationProgress();
    if (progress.length === 0) return 0;

    const totalProgress = progress.reduce(
      (sum, card) => sum + card.progress,
      0
    );
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
        errors: [],
      };
    }

    this.isCreating.set(true);

    // Initialize progress tracking
    const initialProgress: AudioCreationProgress[] = cards.map((card) => ({
      cardId: card.id,
      cardWord: card.data.word || card.id,
      status: 'pending',
      progress: 0,
      currentStep: 'Queued for processing',
    }));

    this.creationProgress.set(initialProgress);

    const results = await Promise.allSettled(
      cards.map((card, index) => this.createAudioForSingleCard(card, index))
    );

    this.isCreating.set(false);

    const successfulCards = results.filter(
      (result) => result.status === 'fulfilled'
    ).length;
    const failedCards = results.filter(
      (result) => result.status === 'rejected'
    ).length;
    const errors = results
      .filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected'
      )
      .map((result) => result.reason?.message || 'Unknown error');

    return {
      totalCards: cards.length,
      successfulCards,
      failedCards,
      errors,
    };
  }

  private async createAudioForSingleCard(
    card: BackendCard,
    progressIndex: number
  ): Promise<void> {
    const audioMap = card.data.audio || {};
    
    // Pick a random voice for this card if not already set
    const audioVoice = card.data.audioVoice || this.getRandomVoice();

    try {
      // Step 0: Clean up unused audio entries (15% progress)
      this.updateProgress(
        progressIndex,
        'updating-card',
        15,
        'Cleaning up unused audio...'
      );
      const cleanedAudioMap = await this.cleanupUnusedAudioKeys(card, audioMap);

      // Step 1: Generate audio for the German word (30% progress)
      this.updateProgress(
        progressIndex,
        'generating-word-audio',
        30,
        'Generating audio for German word...'
      );
      if (card.data.word && !cleanedAudioMap[card.data.word]) {
        const wordAudioResponse = await fetchJson<{ id: string }>(
          this.http,
          `/api/audio`,
          {
            body: { input: card.data.word, voice: audioVoice },
            method: 'POST',
          }
        );
        cleanedAudioMap[card.data.word] = wordAudioResponse.id;
      }

      // Step 2: Generate audio for Hungarian translation (55% progress)
      this.updateProgress(
        progressIndex,
        'generating-translation-audio',
        55,
        'Generating audio for translation...'
      );
      if (
        card.data.translation?.['hu'] &&
        !cleanedAudioMap[card.data.translation['hu']]
      ) {
        const translationAudioResponse = await fetchJson<{ id: string }>(
          this.http,
          `/api/audio`,
          {
            body: { input: card.data.translation['hu'], voice: audioVoice },
            method: 'POST',
          }
        );
        cleanedAudioMap[card.data.translation['hu']] =
          translationAudioResponse.id;
      }

      // Step 3: Generate audio for selected example and its translation (80% progress)
      this.updateProgress(
        progressIndex,
        'generating-example-audio',
        80,
        'Generating audio for examples...'
      );
      const selectedExample = card.data.examples?.find(
        (example: any) => example.isSelected
      );
      if (selectedExample) {
        // German example
        if (selectedExample.de && !cleanedAudioMap[selectedExample.de]) {
          const exampleAudioResponse = await fetchJson<{ id: string }>(
            this.http,
            `/api/audio`,
            {
              body: { input: selectedExample.de, voice: audioVoice },
              method: 'POST',
            }
          );
          cleanedAudioMap[selectedExample.de] = exampleAudioResponse.id;
        }

        // Hungarian example translation
        if (selectedExample.hu && !cleanedAudioMap[selectedExample.hu]) {
          const exampleTranslationAudioResponse = await fetchJson<{
            id: string;
          }>(this.http, `/api/audio`, {
            body: { input: selectedExample.hu, voice: audioVoice },
            method: 'POST',
          });
          cleanedAudioMap[selectedExample.hu] =
            exampleTranslationAudioResponse.id;
        }
      }

      // Step 4: Update card with audio IDs (90% progress)
      this.updateProgress(
        progressIndex,
        'updating-card',
        90,
        'Updating card with audio data...'
      );

      // Create the updated card data by merging existing data with new audio and voice
      const updatedCardData = {
        ...card.data,
        audio: cleanedAudioMap,
        audioVoice: audioVoice,
      };

      // Update the card
      await fetchJson(this.http, `/api/card/${card.id}`, {
        body: updatedCardData,
        method: 'PUT',
      });

      // Step 5: Set card readiness to ready (95% progress)
      this.updateProgress(
        progressIndex,
        'updating-card',
        95,
        'Setting card readiness to ready...'
      );

      await this.readinessService.updateCardReadiness(card.id, 'READY');

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
    this.creationProgress.update((progressList) => {
      const newProgress = [...progressList];
      if (newProgress[index]) {
        newProgress[index] = {
          ...newProgress[index],
          status,
          progress,
          currentStep,
        };
      }
      return newProgress;
    });
  }

  /**
   * Clean up audio keys that are no longer needed based on current card data
   */
  private async cleanupUnusedAudioKeys(
    card: BackendCard,
    audioMap: Record<string, string>
  ): Promise<Record<string, string>> {
    // Collect all text keys that should have audio based on current card data
    const validAudioKeys = new Set<string>();

    // Add word if exists
    if (card.data.word) {
      validAudioKeys.add(card.data.word);
    }

    // Add Hungarian translation if exists
    if (card.data.translation?.['hu']) {
      validAudioKeys.add(card.data.translation['hu']);
    }

    // Add selected example texts if they exist
    const selectedExample = card.data.examples?.find(
      (example: any) => example.isSelected
    );
    if (selectedExample) {
      if (selectedExample.de) {
        validAudioKeys.add(selectedExample.de);
      }
      if (selectedExample.hu) {
        validAudioKeys.add(selectedExample.hu);
      }
    }

    // Create new audio map with only valid keys
    const cleanedAudioMap: Record<string, string> = {};
    const audioKeysToDelete: string[] = [];

    // Check existing audio keys
    for (const [text, audioId] of Object.entries(audioMap)) {
      if (validAudioKeys.has(text)) {
        // Keep this audio entry
        cleanedAudioMap[text] = audioId;
      } else {
        // Mark for deletion
        audioKeysToDelete.push(audioId);
      }
    }

    // Delete unused audio files from blob storage
    if (audioKeysToDelete.length > 0) {
      try {
        // Call backend to delete audio files
        for (const audioId of audioKeysToDelete) {
          await fetchJson(this.http, `/api/audio/${audioId}`, {
            method: 'DELETE',
          });
        }
      } catch (error) {
        console.warn('Failed to delete some unused audio files:', error);
        // Continue processing even if cleanup fails
      }
    }

    return cleanedAudioMap;
  }

  private getRandomVoice(): string {
    const voices = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer', 'verse'];
    const randomIndex = Math.floor(Math.random() * voices.length);
    return voices[randomIndex];
  }

  clearProgress(): void {
    this.creationProgress.set([]);
  }
}
