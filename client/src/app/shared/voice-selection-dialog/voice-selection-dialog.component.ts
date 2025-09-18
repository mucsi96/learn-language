import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { fetchAudio } from '../../utils/fetchAudio';
import { fetchJson } from '../../utils/fetchJson';
import { AudioData, LANGUAGE_CODES } from '../types/audio-generation.types';

interface Voice {
  id: string;
  displayName: string;
  languages: Language[];
}

interface Language {
  name: string;
}

interface VoiceOption {
  key: string;
  voiceId: string;
  displayName: string;
  languageCode: string;
  languageLabel: string;
  hasAudio: boolean;
  audioId?: string;
  isSelected: boolean;
  isGenerating: boolean;
}

interface VoiceGroup {
  languageCode: string;
  languageLabel: string;
  options: VoiceOption[];
}

@Component({
  selector: 'app-voice-selection-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './voice-selection-dialog.component.html',
  styleUrl: './voice-selection-dialog.component.css',
})
export class VoiceSelectionDialogComponent {
  private readonly http = inject(HttpClient);
  private readonly dialogRef = inject(MatDialogRef<VoiceSelectionDialogComponent>);
  private readonly destroyRef = inject(DestroyRef);

  private readonly supportedLanguageCodes: string[] = [
    LANGUAGE_CODES.GERMAN,
    LANGUAGE_CODES.HUNGARIAN,
  ];

  private readonly languageLabels = new Map<string, string>([
    [LANGUAGE_CODES.GERMAN, 'German'],
    [LANGUAGE_CODES.HUNGARIAN, 'Hungarian'],
    [LANGUAGE_CODES.SWISS_GERMAN, 'Swiss German'],
    [LANGUAGE_CODES.ENGLISH, 'English'],
  ]);

  readonly cardAudio = signal<AudioData[]>([]);
  readonly cardTexts = signal<string[]>([]);

  private readonly voices = signal<Voice[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly loadError = signal<string | null>(null);

  private readonly generatingKeys = signal<Set<string>>(new Set());
  private readonly playingKey = signal<string | null>(null);

  private readonly audioElement = new Audio();
  private readonly audioCache = new Map<string, string>();

  readonly hasInputTexts = computed(() => this.cardTexts().length > 0);

  readonly voiceGroups = computed<VoiceGroup[]>(() => {
    const currentAudio = this.cardAudio();
    const voices = this.voices();

    if (!voices.length) {
      return [];
    }

    const groups = new Map<string, VoiceGroup>();

    for (const voice of voices) {
      for (const language of voice.languages) {
        if (!this.supportedLanguageCodes.includes(language.name)) {
          continue;
        }

        const languageLabel = this.languageLabels.get(language.name) || language.name;
        const languageCode = language.name;
        const key = this.optionKey(voice.id, languageCode);
        const existingAudio = currentAudio.find(
          audio => audio.voice === voice.id && audio.language === languageCode,
        );

        const option: VoiceOption = {
          key,
          voiceId: voice.id,
          displayName: voice.displayName,
          languageCode,
          languageLabel,
          hasAudio: Boolean(existingAudio),
          audioId: existingAudio?.id,
          isSelected: Boolean(existingAudio?.selected),
          isGenerating: this.generatingKeys().has(key),
        };

        if (!groups.has(languageCode)) {
          groups.set(languageCode, {
            languageCode,
            languageLabel,
            options: [],
          });
        }

        groups.get(languageCode)!.options.push(option);
      }
    }

    const ordered: VoiceGroup[] = [];

    for (const languageCode of this.supportedLanguageCodes) {
      const group = groups.get(languageCode);
      if (!group) {
        continue;
      }
      ordered.push({
        ...group,
        options: [...group.options].sort((a, b) => a.displayName.localeCompare(b.displayName)),
      });
    }

    return ordered;
  });

  constructor() {
    this.setupAudioElement();
    void this.loadVoices();
  }

  close() {
    this.dialogRef.close();
  }

  isPlaying(option: VoiceOption): boolean {
    return this.playingKey() === option.key;
  }

  async play(option: VoiceOption, event?: Event) {
    event?.stopPropagation();
    if (!option.audioId) {
      return;
    }

    const key = option.key;

    if (this.playingKey() === key) {
      this.stopPlayback();
      return;
    }

    try {
      this.stopPlayback();
      this.playingKey.set(key);
      this.audioElement.src = await this.getAudioUrl(option.audioId);
      await this.audioElement.play();
    } catch (error) {
      console.error('Failed to play audio preview', error);
      if (option.audioId) {
        const cachedUrl = this.audioCache.get(option.audioId);
        if (cachedUrl) {
          URL.revokeObjectURL(cachedUrl);
          this.audioCache.delete(option.audioId);
        }
      }
      this.stopPlayback();
    }
  }

  async generate(option: VoiceOption, event?: Event) {
    event?.stopPropagation();

    if (!this.hasInputTexts()) {
      return;
    }

    const key = option.key;
    if (this.generatingKeys().has(key)) {
      return;
    }

    const updated = new Set(this.generatingKeys());
    updated.add(key);
    this.generatingKeys.set(updated);

    try {
      const payload = {
        input: this.cardTexts().join('. '),
        voice: option.voiceId,
        model: 'eleven_turbo_v2_5',
        language: option.languageCode,
        selected: false,
      };

      const audioData = await fetchJson(this.http, '/api/audio', {
        method: 'POST',
        body: payload,
      });

      this.dialogRef.close({ type: 'audio_generated', audioData });
    } catch (error) {
      console.error('Failed to generate audio preview', error);
    } finally {
      const updatedKeys = new Set(this.generatingKeys());
      updatedKeys.delete(key);
      this.generatingKeys.set(updatedKeys);
    }
  }

  select(option: VoiceOption, event?: Event) {
    event?.stopPropagation();
    if (!option.audioId) {
      return;
    }
    this.dialogRef.close({ type: 'voice_selected', audioId: option.audioId });
  }

  retry() {
    void this.loadVoices();
  }

  private async loadVoices() {
    this.isLoading.set(true);
    this.loadError.set(null);

    try {
      const voices = await fetchJson<Voice[]>(this.http, '/api/voices');
      this.voices.set(voices);
    } catch (error) {
      console.error('Failed to load voices', error);
      this.loadError.set('Could not load voices right now. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private optionKey(voiceId: string, languageCode: string): string {
    return `${voiceId}:${languageCode}`;
  }

  private stopPlayback() {
    if (!this.audioElement.paused) {
      this.audioElement.pause();
    }
    this.audioElement.src = '';
    this.playingKey.set(null);
  }

  private setupAudioElement() {
    this.audioElement.preload = 'none';

    const onEnded = () => this.playingKey.set(null);
    const onError = () => this.playingKey.set(null);

    this.audioElement.addEventListener('ended', onEnded);
    this.audioElement.addEventListener('error', onError);

    this.destroyRef.onDestroy(() => {
      this.audioElement.removeEventListener('ended', onEnded);
      this.audioElement.removeEventListener('error', onError);
      this.stopPlayback();
      this.releaseAudioCache();
    });
  }

  private async getAudioUrl(audioId: string): Promise<string> {
    const cached = this.audioCache.get(audioId);
    if (cached) {
      return cached;
    }

    const blobUrl = await fetchAudio(this.http, `/api/audio/${audioId}`);
    this.audioCache.set(audioId, blobUrl);
    return blobUrl;
  }

  private releaseAudioCache() {
    for (const url of this.audioCache.values()) {
      URL.revokeObjectURL(url);
    }
    this.audioCache.clear();
  }
}
