import { Injectable, inject, signal } from '@angular/core';
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
import { DotProgress, DotStatus } from './shared/types/dot-progress.types';
import { ENVIRONMENT_CONFIG } from './environment/environment.config';
import {
  processTasksWithRateLimit,
  summarizeResults,
  BatchResult,
} from './utils/task-processor';

interface VoiceConfiguration {
  id: number;
  voiceId: string;
  model: string;
  language: string;
  displayName: string | null;
  isEnabled: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class BatchAudioCreationService {
  private readonly http = inject(HttpClient);
  private readonly cardTypeRegistry = inject(CardTypeRegistry);
  private readonly environmentConfig = inject(ENVIRONMENT_CONFIG);
  readonly progressDots = signal<DotProgress[]>([]);
  readonly isCreating = signal(false);
  private voiceConfigs: VoiceConfiguration[] = [];

  async createAudioInBatch(cards: Card[], cardType: CardType): Promise<BatchResult> {
    if (this.isCreating()) {
      throw new Error('Batch audio creation already in progress');
    }

    if (cards.length === 0) {
      return { total: 0, succeeded: 0, failed: 0, errors: [] };
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

    this.progressDots.set(cards.map(card => ({
      label: strategy.getCardDisplayLabel(card),
      status: 'pending' as const,
      tooltip: `${strategy.getCardDisplayLabel(card)}: Queued`,
    })));

    const tasks = cards.map(
      (card, index) => () => this.createAudioForSingleCard(card, index, strategy)
    );

    const results = await processTasksWithRateLimit(
      tasks,
      this.environmentConfig.audioRateLimitPerMinute
    );

    this.isCreating.set(false);

    return summarizeResults(results);
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
    const label = this.progressDots()[progressIndex].label;

    try {
      this.updateDot(progressIndex, 'in-progress', `${label}: Cleaning up unused audio...`);
      const cleanedAudioList = await this.cleanupUnusedAudio(card, existingAudioList, strategy);

      this.updateDot(progressIndex, 'in-progress', `${label}: Generating audio...`);

      const audioItems = strategy.getAudioItems(card);
      const itemsNeedingAudio = audioItems.filter(
        (item) => !this.hasAudioForText(cleanedAudioList, item.text)
      );

      const voicesByLanguage = new Map(
        [...new Set(itemsNeedingAudio.map(item => item.language))].map(
          language => [language, this.getVoiceForLanguage(language, progressIndex)]
        )
      );

      const generatedAudio = await this.generateAudioForItems(
        itemsNeedingAudio,
        voicesByLanguage,
        progressIndex,
        label
      );

      const finalAudioList = [...cleanedAudioList, ...generatedAudio];

      this.updateDot(progressIndex, 'in-progress', `${label}: Updating card...`);

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

      this.updateDot(progressIndex, 'completed', `${label}: Done`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.updateDot(progressIndex, 'error', `${label}: Error - ${errorMsg}`);
      throw error;
    }
  }

  private async generateAudioForItems(
    items: AudioGenerationItem[],
    voicesByLanguage: Map<string, VoiceModelPair>,
    progressIndex: number,
    label: string
  ): Promise<AudioData[]> {
    const generateSingleAudio = async (item: AudioGenerationItem): Promise<AudioData> => {
      const voice = voicesByLanguage.get(item.language)!;
      const audioData = await fetchJson<AudioData>(
        this.http,
        `/api/audio`,
        {
          body: {
            input: item.text,
            voice: voice.voice,
            model: voice.model,
            language: item.language,
            selected: true,
            context: item.context,
            singleWord: item.singleWord
          } satisfies AudioSourceRequest,
          method: 'POST',
        }
      );
      this.updateDot(
        progressIndex,
        'in-progress',
        `${label}: Generated "${item.text.substring(0, 30)}${item.text.length > 30 ? '...' : ''}"`
      );
      return audioData;
    };

    return items.reduce<Promise<AudioData[]>>(
      async (accPromise, item) => {
        const acc = await accPromise;
        const audioData = await generateSingleAudio(item);
        return [...acc, audioData];
      },
      Promise.resolve([])
    );
  }

  private updateDot(index: number, status: DotStatus, tooltip: string): void {
    this.progressDots.update(dots =>
      dots.map((dot, i) => i === index ? { ...dot, status, tooltip } : dot)
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

  private getVoiceForLanguage(language: string, cardIndex: number): VoiceModelPair {
    const languageVoices = this.voiceConfigs.filter(
      (config) => config.language === language && config.isEnabled
    );

    if (languageVoices.length > 0) {
      const config = languageVoices[cardIndex % languageVoices.length];
      return { voice: config.voiceId, model: config.model };
    }

    throw new Error(`No voices configured for language: ${language}`);
  }

  clearProgress(): void {
    this.progressDots.set([]);
  }
}
