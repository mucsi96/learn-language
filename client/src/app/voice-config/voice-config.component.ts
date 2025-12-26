import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { VoiceConfigService, VoiceConfiguration } from './voice-config.service';
import { CardPreviewComponent } from './card-preview/card-preview.component';
import { AddVoiceDialogComponent } from './add-voice-dialog/add-voice-dialog.component';
import { ConfirmDialogComponent } from '../parser/edit-card/confirm-dialog/confirm-dialog.component';
import { AudioPlaybackService } from '../shared/services/audio-playback.service';
import { fetchJson } from '../utils/fetchJson';
import { AudioData, AudioResponse } from '../shared/types/audio-generation.types';

@Component({
  selector: 'app-voice-config',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    FormsModule,
    CardPreviewComponent,
  ],
  templateUrl: './voice-config.component.html',
  styleUrl: './voice-config.component.css',
})
export class VoiceConfigComponent {
  private readonly service = inject(VoiceConfigService);
  private readonly dialog = inject(MatDialog);
  private readonly http = inject(HttpClient);
  private readonly audioPlayback = inject(AudioPlaybackService);

  private readonly audioCache = new Map<string, AudioData>();

  readonly configurations = this.service.configurations;
  readonly availableVoices = this.service.availableVoices;
  readonly audioModels = this.service.audioModels;
  readonly sampleCards = this.service.sampleCards;
  readonly supportedLanguages = this.service.supportedLanguages;

  readonly selectedCardIndex = signal(0);
  readonly previewingConfigId = signal<number | null>(null);
  readonly generatingConfigId = signal<number | null>(null);

  readonly displayedColumns = [
    'displayName',
    'category',
    'model',
    'enabled',
    'actions',
  ];

  readonly selectedCard = computed(() => {
    const cards = this.sampleCards.value();
    const index = this.selectedCardIndex();
    return cards?.[index] ?? null;
  });

  readonly groupedConfigurations = computed(() => {
    const configs = this.configurations.value();
    if (!configs) return null;

    const groups: Record<string, VoiceConfiguration[]> = {};
    for (const config of configs) {
      if (!groups[config.language]) {
        groups[config.language] = [];
      }
      groups[config.language].push(config);
    }
    return groups;
  });

  readonly availableVoicesForAdd = computed(() => {
    const voices = this.availableVoices;
    const configs = this.configurations.value();

    const configuredVoiceIds = new Set(
      configs?.map((c) => `${c.voiceId}-${c.language}`) ?? []
    );

    return voices.filter((voice) =>
      voice.languages.some(
        (lang) => !configuredVoiceIds.has(`${voice.id}-${lang.name}`)
      )
    );
  });

  getLanguageLabel(code: string): string {
    const lang = this.supportedLanguages.find((l) => l.code === code);
    return lang?.displayName ?? code;
  }

  getVoiceDisplayName(config: VoiceConfiguration): string {
    if (config.displayName) return config.displayName;
    const voice = this.availableVoices.find((v) => v.id === config.voiceId);
    return voice?.displayName ?? config.voiceId;
  }

  getModelDisplayName(modelId: string): string {
    const model = this.audioModels.find((m) => m.id === modelId);
    return model?.displayName ?? modelId;
  }

  getVoiceCategory(config: VoiceConfiguration): string | null {
    const voice = this.availableVoices.find((v) => v.id === config.voiceId);
    return voice?.category ?? null;
  }

  async toggleEnabled(config: VoiceConfiguration): Promise<void> {
    await this.service.toggleEnabled(config);
  }

  openAddDialog(): void {
    const dialogRef = this.dialog.open(AddVoiceDialogComponent, {
      width: '500px',
      data: {
        availableVoices: this.availableVoices,
        existingConfigs: this.configurations.value() ?? [],
        audioModels: this.audioModels,
        supportedLanguages: this.supportedLanguages,
      },
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.service.createConfiguration(result);
      }
    });
  }

  async deleteConfiguration(config: VoiceConfiguration): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: `Delete voice "${this.getVoiceDisplayName(config)}" for ${this.getLanguageLabel(config.language)}?`,
      },
    });

    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (confirmed) {
        await this.service.deleteConfiguration(config.id);
      }
    });
  }

  async previewVoice(config: VoiceConfiguration): Promise<void> {
    const card = this.selectedCard();
    if (!card) return;

    if (this.previewingConfigId() === config.id) {
      this.audioPlayback.stopPlayback();
      this.previewingConfigId.set(null);
      return;
    }

    this.audioPlayback.stopPlayback();
    this.previewingConfigId.set(config.id);
    this.generatingConfigId.set(config.id);

    try {
      const textsToSpeak = this.getTextsForLanguage(card, config.language);
      if (textsToSpeak.length === 0) {
        this.generatingConfigId.set(null);
        this.previewingConfigId.set(null);
        return;
      }

      const audioData: AudioData[] = [];
      for (const text of textsToSpeak) {
        const cacheKey = this.getAudioCacheKey(text, config);
        const cached = this.audioCache.get(cacheKey);

        if (cached) {
          audioData.push(cached);
        } else {
          const response = await fetchJson<AudioResponse>(
            this.http,
            '/api/audio',
            {
              method: 'POST',
              body: {
                input: text,
                voice: config.voiceId,
                model: config.model,
                language: config.language,
              },
            }
          );
          const audio: AudioData = {
            id: response.id,
            voice: config.voiceId,
            model: config.model,
            language: config.language,
            text,
          };
          this.audioCache.set(cacheKey, audio);
          audioData.push(audio);
        }
      }

      this.generatingConfigId.set(null);
      await this.audioPlayback.playAudioSequence(this.http, audioData);
    } catch (error) {
      console.error('Error previewing voice:', error);
    } finally {
      this.generatingConfigId.set(null);
      this.previewingConfigId.set(null);
    }
  }

  private getAudioCacheKey(text: string, config: VoiceConfiguration): string {
    return `${text}|${config.voiceId}|${config.model}|${config.language}`;
  }

  private getTextsForLanguage(card: any, language: string): string[] {
    const texts: string[] = [];
    const selectedExample = card.data?.examples?.find(
      (ex: any) => ex.isSelected
    );

    if (language === 'de') {
      if (card.data?.word) texts.push(card.data.word);
      if (selectedExample?.de) texts.push(selectedExample.de);
    } else if (language === 'hu') {
      if (card.data?.translation?.hu) texts.push(card.data.translation.hu);
      if (selectedExample?.hu) texts.push(selectedExample.hu);
    }

    return texts;
  }

  nextCard(): void {
    const cards = this.sampleCards.value();
    if (!cards) return;
    this.selectedCardIndex.update((i) => (i + 1) % cards.length);
  }

  prevCard(): void {
    const cards = this.sampleCards.value();
    if (!cards) return;
    this.selectedCardIndex.update((i) => (i - 1 + cards.length) % cards.length);
  }

  refreshCards(): void {
    this.service.refreshSampleCards();
    this.selectedCardIndex.set(0);
  }
}
