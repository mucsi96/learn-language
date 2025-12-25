import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from './utils/fetchJson';
import { Card } from './parser/types';
import { mapCardDatesToISOStrings } from './utils/date-mapping.util';
import {
  AudioSourceRequest,
  AudioResponse,
  AudioData,
  LANGUAGE_CODES,
  VoiceModelPair
} from './shared/types/audio-generation.types';

interface VoiceConfiguration {
  id: number;
  voiceId: string;
  model: string;
  language: string;
  displayName: string | null;
  isEnabled: boolean;
}


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
  readonly creationProgress = signal<AudioCreationProgress[]>([]);
  readonly isCreating = signal(false);
  private voiceConfigsCache: VoiceConfiguration[] = [];

  readonly totalProgress = computed(() => {
    const progress = this.creationProgress();
    if (progress.length === 0) return 0;

    const totalProgress = progress.reduce(
      (sum, card) => sum + card.progress,
      0
    );
    return totalProgress / progress.length;
  });

  async createAudioInBatch(cards: Card[]): Promise<BatchAudioCreationResult> {
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

    // Fetch enabled voice configurations from database
    try {
      this.voiceConfigsCache = await fetchJson<VoiceConfiguration[]>(
        this.http,
        '/api/voice-configurations/enabled'
      );
    } catch (error) {
      this.isCreating.set(false);
      throw new Error('Failed to fetch voice configurations');
    }

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
    card: Card,
    progressIndex: number
  ): Promise<void> {
    const audioList: AudioData[] = card.data.audio || [];

    // Select one voice/model pair for each language for this card
    const germanVoice = this.getVoiceForLanguage(LANGUAGE_CODES.GERMAN);
    const hungarianVoice = this.getVoiceForLanguage(LANGUAGE_CODES.HUNGARIAN);

    try {
      // Step 0: Clean up unused audio entries (15% progress)
      this.updateProgress(
        progressIndex,
        'updating-card',
        15,
        'Cleaning up unused audio...'
      );
      const cleanedAudioList = await this.cleanupUnusedAudioKeys(card, audioList);

      // Step 1: Generate audio for the German word (30% progress)
      this.updateProgress(
        progressIndex,
        'generating-word-audio',
        30,
        'Generating audio for German word...'
      );
      if (card.data.word && !this.hasAudioForText(cleanedAudioList, card.data.word)) {
        const wordAudioResponse = await fetchJson<AudioData>(
          this.http,
          `/api/audio`,
          {
            body: { 
              input: card.data.word, 
              voice: germanVoice.voice, 
              model: germanVoice.model,
              language: LANGUAGE_CODES.GERMAN,
              selected: true
            } satisfies AudioSourceRequest,
            method: 'POST',
          }
        );
        cleanedAudioList.push(wordAudioResponse);
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
        !this.hasAudioForText(cleanedAudioList, card.data.translation['hu'])
      ) {
        const translationAudioResponse = await fetchJson<AudioData>(
          this.http,
          `/api/audio`,
          {
            body: { 
              input: card.data.translation['hu'], 
              voice: hungarianVoice.voice, 
              model: hungarianVoice.model,
              language: LANGUAGE_CODES.HUNGARIAN,
              selected: true
            } satisfies AudioSourceRequest,
            method: 'POST',
          }
        );
        cleanedAudioList.push(translationAudioResponse);
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
        if (selectedExample['de'] && !this.hasAudioForText(cleanedAudioList, selectedExample['de'])) {
          const exampleAudioResponse = await fetchJson<AudioData>(
            this.http,
            `/api/audio`,
            {
              body: { 
                input: selectedExample['de'], 
                voice: germanVoice.voice, 
                model: germanVoice.model,
                language: LANGUAGE_CODES.GERMAN,
                selected: true
              } satisfies AudioSourceRequest,
              method: 'POST',
            }
          );
          cleanedAudioList.push(exampleAudioResponse);
        }

        // Hungarian example translation
        if (selectedExample['hu'] && !this.hasAudioForText(cleanedAudioList, selectedExample['hu'])) {
          const exampleTranslationAudioResponse = await fetchJson<AudioData>(
            this.http, `/api/audio`, {
            body: { 
              input: selectedExample['hu'], 
              voice: hungarianVoice.voice, 
              model: hungarianVoice.model,
              language: LANGUAGE_CODES.HUNGARIAN,
              selected: true
            } satisfies AudioSourceRequest,
            method: 'POST',
          });
          cleanedAudioList.push(exampleTranslationAudioResponse);
        }
      }

      // Step 4: Update card with audio IDs (90% progress)
      this.updateProgress(
        progressIndex,
        'updating-card',
        90,
        'Updating card with audio data...'
      );

      // Create the updated card data by merging existing data with new audio
      const updatedCardData: Partial<Card> = {
        data: {
          ...card.data,
          audio: cleanedAudioList,
        },
        readiness: 'READY',
      };

      // Update the card
      await fetchJson(this.http, `/api/card/${card.id}`, {
        body: mapCardDatesToISOStrings(updatedCardData),
        method: 'PUT',
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
    card: Card,
    audioList: AudioData[]
  ): Promise<AudioData[]> {
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
      if (selectedExample['de']) {
        validAudioKeys.add(selectedExample['de']);
      }
      if (selectedExample['hu']) {
        validAudioKeys.add(selectedExample['hu']);
      }
    }

    // Create new audio list with only valid keys
    const cleanedAudioList: AudioData[] = [];
    const audioKeysToDelete: string[] = [];

    // Check existing audio entries
    for (const audioEntry of audioList) {
      if (audioEntry.text && validAudioKeys.has(audioEntry.text)) {
        // Keep this audio entry
        cleanedAudioList.push(audioEntry);
      } else {
        // Mark for deletion 
        audioKeysToDelete.push(audioEntry.id);
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

    return cleanedAudioList;
  }

  private hasAudioForText(audioList: AudioData[], text: string): boolean {
    return audioList.some(audio => audio.text === text);
  }

  private getVoiceForLanguage(language: string): VoiceModelPair {
    const languageVoices = this.voiceConfigsCache.filter(
      (config) => config.language === language && config.isEnabled
    );

    if (languageVoices.length > 0) {
      const randomIndex = Math.floor(Math.random() * languageVoices.length);
      const config = languageVoices[randomIndex];
      return { voice: config.voiceId, model: config.model };
    }

    throw new Error(`No voices configured for language: ${language}`);
  }

  clearProgress(): void {
    this.creationProgress.set([]);
  }
}
