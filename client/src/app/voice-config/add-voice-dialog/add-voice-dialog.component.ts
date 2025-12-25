import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {
  Voice,
  VoiceConfiguration,
  VoiceConfigurationRequest,
} from '../voice-config.service';

interface DialogData {
  availableVoices: Voice[];
  existingConfigs: VoiceConfiguration[];
}

@Component({
  selector: 'app-add-voice-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatSlideToggleModule,
  ],
  templateUrl: './add-voice-dialog.component.html',
  styleUrl: './add-voice-dialog.component.css',
})
export class AddVoiceDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AddVoiceDialogComponent>);
  private readonly data = inject<DialogData>(MAT_DIALOG_DATA);

  readonly selectedVoice = signal<Voice | null>(null);
  readonly selectedLanguage = signal<string>('');
  readonly selectedModel = signal<string>('eleven_turbo_v2_5');
  readonly displayName = signal<string>('');
  readonly isEnabled = signal<boolean>(true);

  readonly models = ['eleven_turbo_v2_5', 'eleven_v3'];

  readonly filteredVoices = computed(() => {
    const configuredPairs = new Set(
      this.data.existingConfigs.map((c) => `${c.voiceId}-${c.language}`)
    );

    return this.data.availableVoices.filter((voice) =>
      voice.languages.some(
        (lang) => !configuredPairs.has(`${voice.id}-${lang.name}`)
      )
    );
  });

  readonly availableLanguages = computed(() => {
    const voice = this.selectedVoice();
    if (!voice) return [];

    const configuredPairs = new Set(
      this.data.existingConfigs.map((c) => `${c.voiceId}-${c.language}`)
    );

    return voice.languages
      .filter((lang) => !configuredPairs.has(`${voice.id}-${lang.name}`))
      .map((lang) => lang.name);
  });

  readonly isValid = computed(() => {
    return (
      this.selectedVoice() !== null &&
      this.selectedLanguage() !== '' &&
      this.selectedModel() !== ''
    );
  });

  onVoiceChange(): void {
    const langs = this.availableLanguages();
    if (langs.length === 1) {
      this.selectedLanguage.set(langs[0]);
    } else {
      this.selectedLanguage.set('');
    }
    this.displayName.set(this.selectedVoice()?.displayName ?? '');
  }

  getLanguageLabel(lang: string): string {
    const labels: Record<string, string> = {
      de: 'German',
      hu: 'Hungarian',
      en: 'English',
      'de-CH': 'Swiss German',
    };
    return labels[lang] || lang;
  }

  save(): void {
    if (!this.isValid()) return;

    const request: VoiceConfigurationRequest = {
      voiceId: this.selectedVoice()!.id,
      language: this.selectedLanguage(),
      model: this.selectedModel(),
      displayName: this.displayName() || undefined,
      isEnabled: this.isEnabled(),
    };

    this.dialogRef.close(request);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
