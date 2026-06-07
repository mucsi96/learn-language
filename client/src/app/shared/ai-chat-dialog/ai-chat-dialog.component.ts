import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogActions,
  MatDialogContent,
  MatDialogTitle,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { fetchJson } from '../../utils/fetchJson';
import { Card } from '../../parser/types';
import { ENVIRONMENT_CONFIG } from '../../environment/environment.config';
import { ActiveRecording, startRecording } from './voice-recorder';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface Segment {
  text: string;
  german: boolean;
}

@Component({
  selector: 'app-ai-chat-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogActions,
    MatDialogContent,
    MatDialogTitle,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './ai-chat-dialog.component.html',
  styleUrl: './ai-chat-dialog.component.css',
})
export class AiChatDialogComponent {
  private readonly data = inject<{ card: Card }>(MAT_DIALOG_DATA);
  private readonly http = inject(HttpClient);
  private readonly environmentConfig = inject(ENVIRONMENT_CONFIG);

  readonly card = this.data.card;
  readonly title =
    this.card.data?.word ?? this.card.data?.grammarTopic ?? 'Kártya';

  readonly messages = signal<ChatTurn[]>([]);
  readonly draft = signal('');
  readonly isSending = signal(false);
  readonly isRecording = signal(false);
  readonly isTranscribing = signal(false);
  readonly isBusy = computed(() => this.isSending() || this.isTranscribing());

  private recording: ActiveRecording | null = null;

  segments(content: string): Segment[] {
    return content
      .split(/\*\*(.+?)\*\*/g)
      .map((text, index) => ({ text, german: index % 2 === 1 }))
      .filter((segment) => segment.text.length > 0);
  }

  async submitText(): Promise<void> {
    const text = this.draft().trim();
    if (text.length === 0 || this.isBusy()) {
      return;
    }
    this.draft.set('');
    await this.sendMessage(text);
  }

  async toggleRecording(): Promise<void> {
    if (this.isRecording()) {
      this.recording?.stop();
      return;
    }
    if (this.isBusy()) {
      return;
    }

    try {
      this.recording = await startRecording();
      this.isRecording.set(true);
      const blob = await this.recording.result;
      this.isRecording.set(false);
      this.recording = null;
      await this.transcribeAndSend(blob);
    } catch (error) {
      console.error('Error recording audio:', error);
      this.isRecording.set(false);
      this.recording = null;
    }
  }

  private async sendMessage(text: string): Promise<void> {
    const model = this.environmentConfig.primaryModelByOperation['explanation'];
    if (!model) {
      console.error('No primary model configured for explanation');
      return;
    }

    this.messages.update((current) => [
      ...current,
      { role: 'user', content: text },
    ]);
    this.isSending.set(true);
    try {
      const response = await fetchJson<{ answer: string }>(
        this.http,
        `/api/card/${this.card.id}/explain?model=${model}`,
        { method: 'POST', body: { messages: this.messages() } }
      );
      this.messages.update((current) => [
        ...current,
        { role: 'assistant', content: response.answer },
      ]);
    } catch (error) {
      console.error('Error requesting explanation:', error);
    } finally {
      this.isSending.set(false);
    }
  }

  private async transcribeAndSend(blob: Blob): Promise<void> {
    this.isTranscribing.set(true);
    try {
      const form = new FormData();
      form.append('file', blob, 'question.webm');
      const response = await firstValueFrom(
        this.http.post<{ text: string }>('/api/transcribe', form)
      );
      const text = response.text.trim();
      if (text.length > 0) {
        await this.sendMessage(text);
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
    } finally {
      this.isTranscribing.set(false);
    }
  }
}
