import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { form, FormField } from '@angular/forms/signals';
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
  VoiceConfiguration,
  VoiceConfigurationRequest,
} from '../voice-config.service';
import { Voice, AudioModel, SupportedLanguage } from '../../environment/environment.config';

interface DialogData {
  availableVoices: Voice[];
  existingConfigs: VoiceConfiguration[];
  audioModels: AudioModel[];
  supportedLanguages: SupportedLanguage[];
}

@Component({
  selector: 'app-add-voice-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormField,
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

  readonly formModel = signal({
    voice: null as Voice | null,
    language: '',
    model: this.getDefaultModelId(),
    displayName: '',
    isEnabled: true,
  });
  readonly voiceForm = form(this.formModel);

  readonly models = this.data.audioModels;

  private getDefaultModelId(): string {
    const defaultModel = this.data.audioModels.find((m) => m.isDefault);
    return defaultModel?.id ?? this.data.audioModels[0]?.id ?? '';
  }

  readonly filteredVoices = computed(() => this.data.availableVoices);

  readonly availableLanguages = computed(() => {
    const voice = this.formModel().voice;
    if (!voice) return [];

    return voice.languages.map((lang) => lang.name);
  });

  readonly isValid = computed(
    () =>
      this.formModel().voice !== null &&
      this.formModel().language !== '' &&
      this.formModel().model !== ''
  );

  onVoiceChange(): void {
    const langs = this.availableLanguages();
    this.formModel.update((m) => ({
      ...m,
      language: langs.length === 1 ? langs[0] : '',
      displayName: m.voice?.displayName ?? '',
    }));
  }

  getLanguageLabel(code: string): string {
    const lang = this.data.supportedLanguages.find((l) => l.code === code);
    return lang?.displayName ?? code;
  }

  getVoiceLanguages(voice: Voice): string {
    return voice.languages.map((l) => this.getLanguageLabel(l.name)).join(', ');
  }

  save(): void {
    if (!this.isValid()) return;

    const data = this.formModel();
    const request: VoiceConfigurationRequest = {
      voiceId: data.voice!.id,
      language: data.language,
      model: data.model,
      displayName: data.displayName || undefined,
      isEnabled: data.isEnabled,
    };

    this.dialogRef.close(request);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
