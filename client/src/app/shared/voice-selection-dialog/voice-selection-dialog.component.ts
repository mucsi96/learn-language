import {
  Component,
  inject,
  signal,
  computed,
  resource,
  Injector,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { fetchJson } from '../../utils/fetchJson';
import { AudioData, AudioResponse } from '../types/audio-generation.types';
import { AudioPlaybackService } from '../services/audio-playback.service';
import { LanguageTexts } from '../../parser/types';
export { LanguageTexts } from '../../parser/types';

interface VoiceConfiguration {
  id: number;
  voiceId: string;
  voiceName: string;
  model: string;
  language: string;
  displayName: string | null;
  isEnabled: boolean;
  category: string | null;
}

interface VoiceCardData {
  config: VoiceConfiguration;
  audioData?: AudioData;
  isGenerating?: boolean;
  isPlaying?: boolean;
}

export interface VoiceSelectionDialogData {
  audioData: AudioData[];
  languageTexts: LanguageTexts[];
}

interface DialogData extends VoiceSelectionDialogData {}

@Component({
  selector: 'app-voice-selection-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatCardModule,
  ],
  templateUrl: './voice-selection-dialog.component.html',
  styleUrl: './voice-selection-dialog.component.css',
})
export class VoiceSelectionDialogComponent implements OnDestroy {
  private readonly dialogRef = inject(
    MatDialogRef<VoiceSelectionDialogComponent>
  );
  private readonly data = inject<DialogData>(MAT_DIALOG_DATA);
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  private readonly audioPlaybackService = inject(AudioPlaybackService);

  // Local copy of audio data for modifications
  readonly localAudioData = signal<AudioData[]>([...this.data.audioData]);

  // Track generating and playing states
  readonly generatingVoices = signal<Set<string>>(new Set());
  readonly playingVoices = signal<Set<string>>(new Set());

  // Fetch enabled voice configurations from API
  readonly voiceConfigurations = resource<VoiceConfiguration[], never>({
    injector: this.injector,
    loader: async () => {
      return await fetchJson<VoiceConfiguration[]>(this.http, '/api/voice-configurations/enabled');
    },
  });

  // Group voice configurations by language
  readonly groupedVoices = computed(() => {
    const configs = this.voiceConfigurations.value();
    if (!configs) return null;

    const groups: Record<string, VoiceCardData[]> = {};
    const targetLanguages = ['hu', 'de']; // Hungarian first, then German

    targetLanguages.forEach((lang) => {
      groups[lang] = configs
        .filter((config) => config.language === lang)
        .sort((a, b) => (a.displayName || a.voiceName).localeCompare(b.displayName || b.voiceName))
        .map((config) => {
          const existingAudio = this.localAudioData().find(
            (audio) =>
              audio.voice === config.voiceId &&
              audio.model === config.model &&
              audio.language === lang
          );
          return {
            config,
            audioData: existingAudio,
          };
        });
    });

    return groups;
  });

  ngOnDestroy() {
    // Clean up audio when component is destroyed
    this.audioPlaybackService.stopPlayback();
  }

  // Get language label for display
  getLanguageLabel(lang: string): string {
    const labels: Record<string, string> = {
      de: 'German',
      hu: 'Hungarian',
    };
    return labels[lang] || lang;
  }

  // Check if a voice is selected for a language
  isSelected(voiceCard: VoiceCardData): boolean {
    return this.localAudioData().some(
      (audio) =>
        audio.voice === voiceCard.config.voiceId &&
        audio.model === voiceCard.config.model &&
        audio.language === voiceCard.config.language &&
        audio.selected
    );
  }

  // Check if voice is currently generating
  isGenerating(voiceCard: VoiceCardData): boolean {
    return this.generatingVoices().has(
      `${voiceCard.config.voiceId}-${voiceCard.config.model}-${voiceCard.config.language}`
    );
  }

  // Check if voice is currently playing
  isPlaying(voiceCard: VoiceCardData): boolean {
    return this.playingVoices().has(
      `${voiceCard.config.voiceId}-${voiceCard.config.model}-${voiceCard.config.language}`
    );
  }

  // Select a voice (no deselection allowed)
  async selectVoice(voiceCard: VoiceCardData) {
    // If already selected, do nothing
    if (this.isSelected(voiceCard)) {
      return;
    }

    // Ensure audio exists before selecting
    if (!voiceCard.audioData) {
      await this.generateAudio(voiceCard);
    }

    // Update selection state
    this.localAudioData.update((audioList) => {
      // Deselect all voices for this language
      audioList.forEach((audio) => {
        if (audio.language === voiceCard.config.language) {
          audio.selected = false;
        }
      });

      // Select ALL audio entries for this voice/model/language combination
      audioList.forEach((audio) => {
        if (
          audio.voice === voiceCard.config.voiceId &&
          audio.model === voiceCard.config.model &&
          audio.language === voiceCard.config.language
        ) {
          audio.selected = true;
        }
      });

      return [...audioList];
    });
  }

  // Generate audio for a voice configuration
  async generateAudio(voiceCard: VoiceCardData) {
    const key = `${voiceCard.config.voiceId}-${voiceCard.config.model}-${voiceCard.config.language}`;

    // Prevent duplicate generation
    if (this.generatingVoices().has(key)) return;

    this.generatingVoices.update((set) => {
      set.add(key);
      return new Set(set);
    });

    try {
      const texts = this.getTextsForLanguage(voiceCard.config.language);
      const generatedAudios: AudioData[] = [];

      for (const text of texts) {
        const response = await fetchJson<AudioResponse>(
          this.http,
          '/api/audio',
          {
            method: 'POST',
            body: {
              input: text,
              voice: voiceCard.config.voiceId,
              model: voiceCard.config.model,
              language: voiceCard.config.language,
            },
          }
        );

        generatedAudios.push({
          id: response.id,
          voice: voiceCard.config.voiceId,
          model: voiceCard.config.model,
          language: voiceCard.config.language,
          text: text,
          selected: false,
        });
      }

      // Add generated audios to local data
      this.localAudioData.update((audioList) => {
        return [...audioList, ...generatedAudios];
      });
    } catch (error) {
      console.error('Error generating audio:', error);
    } finally {
      this.generatingVoices.update((set) => {
        set.delete(key);
        return new Set(set);
      });
    }
  }

  // Handle card click - generate and play audio
  async onCardClick(voiceCard: VoiceCardData) {
    // Don't do anything if currently generating
    if (this.isGenerating(voiceCard)) {
      return;
    }

    // If playing, stop playback
    if (this.isPlaying(voiceCard)) {
      this.stopPlayback();
      return;
    }

    // Stop any other playback first
    this.stopPlayback();

    // Get or generate audio, then play
    const audioEntries = this.localAudioData().filter(
      (audio) =>
        audio.voice === voiceCard.config.voiceId &&
        audio.model === voiceCard.config.model &&
        audio.language === voiceCard.config.language
    );

    const key = `${voiceCard.config.voiceId}-${voiceCard.config.model}-${voiceCard.config.language}`;

    if (audioEntries.length === 0) {
      // Generate audio first if not available
      await this.generateAudio(voiceCard);
      // Re-fetch the generated audio entries
      const newAudioEntries = this.localAudioData().filter(
        (audio) =>
          audio.voice === voiceCard.config.voiceId &&
          audio.model === voiceCard.config.model &&
          audio.language === voiceCard.config.language
      );
      if (newAudioEntries.length > 0) {
        await this.playAudioSequence(newAudioEntries, key);
      }
    } else {
      await this.playAudioSequence(audioEntries, key);
    }
  }

  // Play or stop audio preview (kept for backward compatibility if needed)
  async togglePlayback(voiceCard: VoiceCardData) {
    await this.onCardClick(voiceCard);
  }

  // Play audio sequence with delay
  private async playAudioSequence(audioEntries: AudioData[], key: string) {
    this.playingVoices.update((set) => {
      set.add(key);
      return new Set(set);
    });

    try {
      // Use the shared service to play audio
      await this.audioPlaybackService.playAudioSequence(
        this.http,
        audioEntries
      );
    } catch (error) {
      console.error('Error playing audio:', error);
    } finally {
      this.playingVoices.update((set) => {
        set.delete(key);
        return new Set(set);
      });
    }
  }

  // Stop all audio playback
  private stopPlayback() {
    this.audioPlaybackService.stopPlayback();
    this.playingVoices.set(new Set());
  }

  // Get texts for a specific language from language texts data
  private getTextsForLanguage(language: string): string[] {
    const languageData = this.data.languageTexts.find(
      (lt) => lt.language === language
    );
    return languageData?.texts || [];
  }

  // Save and close dialog
  save() {
    this.dialogRef.close(this.localAudioData());
  }

  // Close without saving
  close() {
    this.audioPlaybackService.stopPlayback();
    this.dialogRef.close();
  }
}
