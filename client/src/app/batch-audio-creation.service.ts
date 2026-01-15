import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from './utils/fetchJson';
import { Card, CardTypeStrategy } from './parser/types';
import { mapCardDatesToISOStrings } from './utils/date-mapping.util';
import {
  AudioSourceRequest,
  AudioData,
  VoiceModelPair
} from './shared/types/audio-generation.types';
import { VocabularyCardType } from './cardTypes/vocabulary-card-type.strategy';

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
    | 'generating-audio'
    | 'updating-card'
    | 'completed'
    | 'error';
  progress: number;
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
  private readonly strategy: CardTypeStrategy = inject(VocabularyCardType);
  readonly creationProgress = signal<AudioCreationProgress[]>([]);
  readonly isCreating = signal(false);
  private voiceConfigs: VoiceConfiguration[] = [];

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

    try {
      this.voiceConfigs = await fetchJson<VoiceConfiguration[]>(
        this.http,
        '/api/voice-configurations/enabled'
      );
    } catch (error) {
      this.isCreating.set(false);
      throw new Error('Failed to fetch voice configurations');
    }

    const requiredLanguages = this.strategy.getRequiredLanguagesForAudio();
    for (const language of requiredLanguages) {
      const hasVoice = this.voiceConfigs.some(
        (config) => config.language === language
      );
      if (!hasVoice) {
        this.isCreating.set(false);
        throw new Error(`No enabled voice configurations for language: ${language}`);
      }
    }

    const initialProgress: AudioCreationProgress[] = cards.map((card) => ({
      cardId: card.id,
      cardWord: this.strategy.getCardDisplayLabel(card),
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
    let audioList: AudioData[] = card.data.audio || [];

    try {
      this.updateProgress(
        progressIndex,
        'updating-card',
        10,
        'Cleaning up unused audio...'
      );
      audioList = await this.cleanupUnusedAudioKeys(card, audioList);

      const audioItems = this.strategy.getAudioItemsFromCard(card);
      const totalItems = audioItems.length;
      const progressPerItem = totalItems > 0 ? 70 / totalItems : 0;

      for (let i = 0; i < audioItems.length; i++) {
        const item = audioItems[i];
        const itemProgress = 15 + (i + 1) * progressPerItem;

        this.updateProgress(
          progressIndex,
          'generating-audio',
          Math.round(itemProgress),
          `Generating audio for "${item.text.substring(0, 30)}${item.text.length > 30 ? '...' : ''}"...`
        );

        if (!this.hasAudioForText(audioList, item.text)) {
          const voice = this.getVoiceForLanguage(item.language);
          const audioResponse = await fetchJson<AudioData>(
            this.http,
            `/api/audio`,
            {
              body: {
                input: item.text,
                voice: voice.voice,
                model: voice.model,
                language: item.language,
                selected: true
              } satisfies AudioSourceRequest,
              method: 'POST',
            }
          );
          audioList.push(audioResponse);
        }
      }

      this.updateProgress(
        progressIndex,
        'updating-card',
        90,
        'Updating card with audio data...'
      );

      const updatedCardData: Partial<Card> = {
        data: {
          ...card.data,
          audio: audioList,
        },
        readiness: 'READY',
      };

      await fetchJson(this.http, `/api/card/${card.id}`, {
        body: mapCardDatesToISOStrings(updatedCardData),
        method: 'PUT',
      });

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

  private async cleanupUnusedAudioKeys(
    card: Card,
    audioList: AudioData[]
  ): Promise<AudioData[]> {
    const validAudioKeys = this.strategy.getValidAudioTextsFromCard(card);
    const cleanedAudioList: AudioData[] = [];
    const audioKeysToDelete: string[] = [];

    for (const audioEntry of audioList) {
      if (audioEntry.text && validAudioKeys.has(audioEntry.text)) {
        cleanedAudioList.push(audioEntry);
      } else {
        audioKeysToDelete.push(audioEntry.id);
      }
    }

    if (audioKeysToDelete.length > 0) {
      try {
        for (const audioId of audioKeysToDelete) {
          await fetchJson(this.http, `/api/audio/${audioId}`, {
            method: 'DELETE',
          });
        }
      } catch (error) {
        console.warn('Failed to delete some unused audio files:', error);
      }
    }

    return cleanedAudioList;
  }

  private hasAudioForText(audioList: AudioData[], text: string): boolean {
    return audioList.some(audio => audio.text === text);
  }

  private getVoiceForLanguage(language: string): VoiceModelPair {
    const languageVoices = this.voiceConfigs.filter(
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
