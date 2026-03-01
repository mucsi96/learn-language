import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from './utils/fetchJson';
import {
  Card,
  CardType,
  CardTypeStrategy,
  AudioGenerationItem,
} from './parser/types';
import { mapCardDatesToISOStrings } from './utils/date-mapping.util';
import { CardTypeRegistry } from './cardTypes/card-type.registry';
import {
  AudioSourceRequest,
  AudioData,
  VoiceModelPair,
} from './shared/types/audio-generation.types';
import { DotProgress } from './shared/types/dot-progress.types';
import { RateLimitTokenService } from './rate-limit-token.service';
import {
  runPipeline,
  PipelineResult,
  PipelineTask,
  ProgressUpdater,
} from './utils/processing-pipeline';

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
  private readonly rateLimitTokenService = inject(RateLimitTokenService);
  readonly progress = signal<DotProgress[]>([]);
  readonly isProcessing = signal(false);
  readonly toolPool = this.rateLimitTokenService.audioPool;
  private voiceConfigs: VoiceConfiguration[] = [];

  async createAudioInBatch(
    cards: Card[],
    cardType: CardType
  ): Promise<PipelineResult> {
    if (this.isProcessing()) {
      throw new Error('Batch audio creation already in progress');
    }

    if (cards.length === 0) {
      return { total: 0, succeeded: 0, failed: 0, errors: [] };
    }

    const strategy = this.cardTypeRegistry.getStrategy(cardType);

    this.isProcessing.set(true);

    try {
      this.voiceConfigs = await fetchJson<VoiceConfiguration[]>(
        this.http,
        '/api/voice-configurations/enabled'
      );
    } catch {
      this.isProcessing.set(false);
      throw new Error('Failed to fetch voice configurations');
    }

    const missingLanguages = this.getMissingVoiceLanguages(strategy);
    if (missingLanguages.length > 0) {
      this.isProcessing.set(false);
      throw new Error(
        `No enabled voice configurations for languages: ${missingLanguages.join(', ')}`
      );
    }

    const tasks: PipelineTask<void>[] = cards.map((card, index) => ({
      label: strategy.getCardDisplayLabel(card),
      execute: (
        updateProgress: ProgressUpdater,
        toolsRequested: () => void
      ) => this.processCard(card, index, updateProgress, toolsRequested, strategy),
    }));

    try {
      return await runPipeline(tasks, this.toolPool, this.progress);
    } finally {
      this.isProcessing.set(false);
    }
  }

  clearProgress(): void {
    this.progress.set([]);
  }

  private getMissingVoiceLanguages(strategy: CardTypeStrategy): string[] {
    const requiredLanguages = strategy.requiredAudioLanguages();
    return requiredLanguages.filter(
      (language) =>
        !this.voiceConfigs.some((config) => config.language === language)
    );
  }

  private async processCard(
    card: Card,
    cardIndex: number,
    updateProgress: ProgressUpdater,
    toolsRequested: () => void,
    strategy: CardTypeStrategy
  ): Promise<void> {
    const existingAudioList: AudioData[] = card.data.audio || [];
    const label = strategy.getCardDisplayLabel(card);

    try {
      updateProgress('in-progress', `${label}: Cleaning up unused audio...`);
      const cleanedAudioList = await this.cleanupUnusedAudio(
        card,
        existingAudioList,
        strategy
      );

      updateProgress('in-progress', `${label}: Generating audio...`);

      const audioItems = strategy.getAudioItems(card);
      const itemsNeedingAudio = audioItems.filter(
        (item) => !this.hasAudioForText(cleanedAudioList, item.text)
      );

      const voicesByLanguage = new Map(
        [...new Set(itemsNeedingAudio.map((item) => item.language))].map(
          (language) => [
            language,
            this.getVoiceForLanguage(language, cardIndex),
          ]
        )
      );

      const generatedAudio = await this.generateAudioForItems(
        itemsNeedingAudio,
        voicesByLanguage,
        updateProgress,
        label,
        toolsRequested
      );

      const finalAudioList = [...cleanedAudioList, ...generatedAudio];

      updateProgress('in-progress', `${label}: Updating card...`);

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

      updateProgress('completed', `${label}: Done`);
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error';
      updateProgress('error', `${label}: Error - ${errorMsg}`);
      throw error;
    }
  }

  private async generateAudioForItems(
    items: AudioGenerationItem[],
    voicesByLanguage: Map<string, VoiceModelPair>,
    updateProgress: ProgressUpdater,
    label: string,
    onToolsRequested: () => void
  ): Promise<AudioData[]> {
    if (items.length === 0) {
      onToolsRequested();
      return [];
    }

    const acquirePromises = items.map(() => this.toolPool.acquire());
    onToolsRequested();

    return Promise.all(
      items.map(async (item, i) => {
        const voice = voicesByLanguage.get(item.language)!;
        await acquirePromises[i];
        try {
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
                singleWord: item.singleWord,
              } satisfies AudioSourceRequest,
              method: 'POST',
            }
          );
          updateProgress(
            'in-progress',
            `${label}: Generated "${item.text.substring(0, 30)}${item.text.length > 30 ? '...' : ''}"`
          );
          return audioData;
        } finally {
          this.toolPool.release();
        }
      })
    );
  }

  private async cleanupUnusedAudio(
    card: Card,
    audioList: AudioData[],
    strategy: CardTypeStrategy
  ): Promise<AudioData[]> {
    const validAudioTexts = new Set(
      strategy.getAudioItems(card).map((item) => item.text)
    );

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
    return audioList.some((audio) => audio.text === text);
  }

  private getVoiceForLanguage(
    language: string,
    cardIndex: number
  ): VoiceModelPair {
    const languageVoices = this.voiceConfigs.filter(
      (config) => config.language === language && config.isEnabled
    );

    if (languageVoices.length > 0) {
      const config = languageVoices[cardIndex % languageVoices.length];
      return { voice: config.voiceId, model: config.model };
    }

    throw new Error(`No voices configured for language: ${language}`);
  }
}
