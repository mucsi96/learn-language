import { Component, inject, computed, signal, resource } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { HttpClient } from '@angular/common/http';
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


interface VoiceWithAudio {
  voice: Voice;
  hasAudio: boolean;
  audioId?: string;
  isGenerating: boolean;
}

interface VoiceAudioInfo {
  hasAudio: boolean;
  isSelected: boolean;
  audioId?: string;
  isGenerating: boolean;
  languageCode: string;
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
    MatCardModule,
    MatGridListModule,
    MatChipsModule,
    MatTooltipModule,
    MatRippleModule,
  ],
  templateUrl: './voice-selection-dialog.component.html',
  styleUrl: './voice-selection-dialog.component.css',
})
export class VoiceSelectionDialogComponent {
  private readonly supportedLanguageCodes = [LANGUAGE_CODES.GERMAN, LANGUAGE_CODES.HUNGARIAN];

  private readonly languageNames = new Map<string, string>([
    [LANGUAGE_CODES.GERMAN, 'German'],
    [LANGUAGE_CODES.HUNGARIAN, 'Hungarian'],
    [LANGUAGE_CODES.SWISS_GERMAN, 'Swiss German'],
    [LANGUAGE_CODES.ENGLISH, 'English']
  ]);

  readonly supportedLanguages = computed(() => {
    return this.supportedLanguageCodes.map(code => this.languageNames.get(code) || code);
  });
  cardAudio = signal<AudioData[]>([]);
  cardTexts = signal<string[]>([]);
  selectedVoiceId = signal<string | null>(null);
  generatingVoices = signal<Set<string>>(new Set());

  private readonly http = inject(HttpClient);
  private readonly dialogRef = inject(MatDialogRef<VoiceSelectionDialogComponent>);

  readonly availableVoices = resource<Voice[], never>({
    loader: async () => {
      return await fetchJson(this.http, '/api/voices');
    },
  });

  readonly groupedVoices = computed(() => {
    const voices = this.availableVoices.value();
    const cardAudio = this.cardAudio();

    if (!voices) return new Map<string, VoiceWithAudio[]>();

    const grouped = new Map<string, VoiceWithAudio[]>();

    voices.forEach(voice => {
      voice.languages.forEach(language => {
        // Only include German and Hungarian languages
        if (!this.supportedLanguageCodes.includes(language.name as any)) {
          return;
        }

        const localizedLanguageName = this.languageNames.get(language.name);

        if (!localizedLanguageName) {
          return;
        }

        if (!grouped.has(localizedLanguageName)) {
          grouped.set(localizedLanguageName, []);
        }

        const existingAudio = cardAudio.find(audio =>
          audio.voice === voice.id && audio.language === language.name
        );

        grouped.get(localizedLanguageName)!.push({
          voice,
          hasAudio: !!existingAudio,
          audioId: existingAudio?.id,
          isGenerating: this.generatingVoices().has(`${voice.id}-${language.name}`)
        });
      });
    });

    return grouped;
  });

  readonly currentlySelectedVoice = computed(() => {
    const cardAudio = this.cardAudio();
    return cardAudio.find(audio => audio.selected);
  });

  readonly currentlySelectedVoiceDisplay = computed(() => {
    const selectedAudio = this.currentlySelectedVoice();
    const voices = this.availableVoices.value();

    if (!selectedAudio || !voices) return null;

    const voice = voices.find(v => v.id === selectedAudio.voice);
    const language = voice?.languages.find(l => l.name === selectedAudio.language);

    return {
      ...selectedAudio,
      voiceName: voice?.displayName || selectedAudio.voice,
      languageName: language?.name || selectedAudio.language
    };
  });

  async playAudio(audioId: string) {
    try {
      const audio = new Audio(`/api/audio/${audioId}`);
      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }

  async generateAudio(voice: Voice, language: Language) {
    const voiceKey = `${voice.id}-${language.name}`;
    const generatingSet = new Set(this.generatingVoices());
    generatingSet.add(voiceKey);
    this.generatingVoices.set(generatingSet);

    try {
      const audioData = await fetchJson(this.http, '/api/audio', {
        method: 'POST',
        body: {
          input: this.cardTexts().join('. '),
          voice: voice.id,
          model: 'eleven_turbo_v2_5',
          language: language.name,
          selected: false
        }
      });

      // Emit the new audio data to parent
      this.dialogRef.close({ type: 'audio_generated', audioData });
    } catch (error) {
      console.error('Error generating audio:', error);
    } finally {
      const updatedSet = new Set(this.generatingVoices());
      updatedSet.delete(voiceKey);
      this.generatingVoices.set(updatedSet);
    }
  }

  selectVoice(audioId: string) {
    this.dialogRef.close({ type: 'voice_selected', audioId });
  }

  getVoiceAudioForLanguage(voiceId: string, languageName: string): VoiceAudioInfo | null {
    const languageCode = Array.from(this.languageNames.entries())
      .find(([_, name]) => name === languageName)?.[0];
    
    if (!languageCode) {
      console.log('No language code found for language name:', languageName);
      return null;
    }

    const voice = this.availableVoices.value()?.find(v => v.id === voiceId);
    if (!voice || !voice.languages.some(l => l.name === languageCode)) {
      console.log('Voice not found or does not support language:', voiceId, languageCode);
      return null;
    }

    const cardAudio = this.cardAudio();
    console.log('Looking for audio with voice:', voiceId, 'and language:', languageCode);
    console.log('Available card audio:', cardAudio.map(a => ({ voice: a.voice, language: a.language, id: a.id, selected: a.selected })));
    
    const existingAudio = cardAudio.find(audio => 
      audio.voice === voiceId && audio.language === languageCode
    );

    console.log('Found existing audio:', existingAudio);

    const isGenerating = this.generatingVoices().has(`${voiceId}-${languageCode}`);

    return {
      hasAudio: !!existingAudio,
      isSelected: !!existingAudio?.selected,
      audioId: existingAudio?.id,
      isGenerating,
      languageCode
    };
  }

  async onCellClick(voice: Voice, _languageName: string, audioInfo: VoiceAudioInfo) {
    if (audioInfo.isGenerating) return;

    if (audioInfo.hasAudio && audioInfo.audioId) {
      // If audio exists, play it and optionally select it
      await this.playAudio(audioInfo.audioId);
      
      // If not selected, select this voice
      if (!audioInfo.isSelected) {
        this.selectVoice(audioInfo.audioId);
      }
    } else {
      // Generate audio for this voice and language
      const language = voice.languages.find(l => l.name === audioInfo.languageCode);
      if (language) {
        await this.generateAudio(voice, language);
      }
    }
  }

  getTooltipText(voice: Voice, languageName: string, audioInfo: VoiceAudioInfo): string {
    if (audioInfo.isGenerating) {
      return `Generating ${voice.displayName} in ${languageName}...`;
    }
    if (audioInfo.hasAudio) {
      if (audioInfo.isSelected) {
        return `${voice.displayName} (${languageName}) - Currently selected. Click to play.`;
      }
      return `${voice.displayName} (${languageName}) - Click to play and select.`;
    }
    return `${voice.displayName} (${languageName}) - Click to generate audio.`;
  }

  close() {
    this.dialogRef.close();
  }
}
