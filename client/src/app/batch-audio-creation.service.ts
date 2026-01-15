import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from './utils/fetchJson';
import { Card, CardType, CardTypeStrategy, AudioGenerationItem } from './parser/types';
import { mapCardDatesToISOStrings } from './utils/date-mapping.util';
import { CardTypeRegistry } from './cardTypes/card-type.registry';
import {
  AudioSourceRequest,
  AudioData,
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
  private readonly cardTypeRegistry = inject(CardTypeRegistry);
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

  async createAudioInBatch(cards: Card[], cardType: CardType): Promise<BatchAudioCreationResult> {
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

    const strategy = this.cardTypeRegistry.getStrategy(cardType);

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

    const missingLanguages = this.getMissingVoiceLanguages(strategy);
    if (missingLanguages.length > 0) {
      this.isCreating.set(false);
      throw new Error(`No enabled voice configurations for languages: ${missingLanguages.join(', ')}`);
    }

    const initialProgress: AudioCreationProgress[] = cards.map((card) => ({
      cardId: card.id,
      cardWord: strategy.getCardDisplayLabel(card),
      status: 'pending',
      progress: 0,
      currentStep: 'Queued for processing',
    }));

    this.creationProgress.set(initialProgress);

    const results = await Promise.allSettled(
      cards.map((card, index) => this.createAudioForSingleCard(card, index, strategy))
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

  private getMissingVoiceLanguages(strategy: CardTypeStrategy): string[] {
    const requiredLanguages = strategy.requiredAudioLanguages();
    return requiredLanguages.filter(
      (language) => !this.voiceConfigs.some((config) => config.language === language)
    );
  }

  private async createAudioForSingleCard(
    card: Card,
    progressIndex: number,
    strategy: CardTypeStrategy
  ): Promise<void> {
    const existingAudioList: AudioData[] = card.data.audio || [];

    try {
      this.updateProgress(
        progressIndex,
        'updating-card',
        10,
        'Cleaning up unused audio...'
      );
      const cleanedAudioList = await this.cleanupUnusedAudio(card, existingAudioList, strategy);

      this.updateProgress(
        progressIndex,
        'generating-audio',
        20,
        'Generating audio...'
      );

      const audioItems = strategy.getAudioItems(card);
      const itemsNeedingAudio = audioItems.filter(
        (item) => !this.hasAudioForText(cleanedAudioList, item.text)
      );

      const totalItems = itemsNeedingAudio.length;
      const progressPerItem = totalItems > 0 ? 60 / totalItems : 0;

      const generatedAudio = await this.generateAudioForItems(
        itemsNeedingAudio,
        progressIndex,
        progressPerItem
      );

      const finalAudioList = [...cleanedAudioList, ...generatedAudio];

      this.updateProgress(
        progressIndex,
        'updating-card',
        90,
        'Updating card with audio data...'
      );

      const updatedCardData: Partial<Card> = {
        data: {
          ...card.data,
          audio: finalAudioList,
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

  private async generateAudioForItems(
    items: AudioGenerationItem[],
    progressIndex: number,
    progressPerItem: number
  ): Promise<AudioData[]> {
    const generateSingleAudio = async (item: AudioGenerationItem, index: number): Promise<AudioData> => {
      const voice = this.getVoiceForLanguage(item.language);
      const audioData = await fetchJson<AudioData>(
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
      const progress = Math.min(20 + (index + 1) * progressPerItem, 80);
      this.updateProgress(
        progressIndex,
        'generating-audio',
        progress,
        `Generated audio for "${item.text.substring(0, 30)}${item.text.length > 30 ? '...' : ''}"`
      );
      return audioData;
    };

    return items.reduce<Promise<AudioData[]>>(
      async (accPromise, item, index) => {
        const acc = await accPromise;
        const audioData = await generateSingleAudio(item, index);
        return [...acc, audioData];
      },
      Promise.resolve([])
    );
  }

  private updateProgress(
    index: number,
    status: AudioCreationProgress['status'],
    progress: number,
    currentStep?: string
  ): void {
    this.creationProgress.update((progressList) =>
      progressList.map((item, i) =>
        i === index
          ? { ...item, status, progress, currentStep }
          : item
      )
    );
  }

  private async cleanupUnusedAudio(
    card: Card,
    audioList: AudioData[],
    strategy: CardTypeStrategy
  ): Promise<AudioData[]> {
    const validAudioTexts = new Set(strategy.getAudioItems(card).map(item => item.text));

    const { toKeep, toDelete } = audioList.reduce<{
      toKeep: AudioData[];
      toDelete: string[];
    }>(
      (acc, audioEntry) => {
        if (audioEntry.text && validAudioTexts.has(audioEntry.text)) {
          return { ...acc, toKeep: [...acc.toKeep, audioEntry] };
        }
        return { ...acc, toDelete: [...acc.toDelete, audioEntry.id] };
      },
      { toKeep: [], toDelete: [] }
    );

    if (toDelete.length > 0) {
      try {
        await Promise.all(
          toDelete.map((audioId) =>
            fetchJson(this.http, `/api/audio/${audioId}`, { method: 'DELETE' })
          )
        );
      } catch (error) {
        console.warn('Failed to delete some unused audio files:', error);
      }
    }

    return toKeep;
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
