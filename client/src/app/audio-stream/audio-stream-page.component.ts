import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { injectParams } from '../utils/inject-params';
import { SourcesService } from '../sources.service';
import { AuthService } from '../auth.service';
import { AudioCapture, startAudioCapture } from './audio-capture';

interface TranscriptMessage {
  type: string;
  text?: string;
}

@Component({
  selector: 'app-audio-stream-page',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './audio-stream-page.component.html',
  styleUrl: './audio-stream-page.component.css',
})
export class AudioStreamPageComponent implements OnDestroy {
  private readonly routeSourceId = injectParams('sourceId');
  private readonly sourcesService = inject(SourcesService);
  private readonly auth = inject(AuthService);

  readonly sourceId = computed(() => {
    const id = this.routeSourceId();
    return id ? String(id) : null;
  });

  readonly source = computed(() =>
    (this.sourcesService.sources.value() ?? []).find(
      (s) => s.id === this.sourceId()
    )
  );

  readonly recording = signal(false);
  readonly transcript = signal('');
  readonly error = signal<string | null>(null);

  private socket: WebSocket | null = null;
  private capture: AudioCapture | null = null;
  private destroyed = false;

  async startRecording(): Promise<void> {
    const sourceId = this.sourceId();
    if (!sourceId || this.recording()) {
      return;
    }
    this.error.set(null);
    this.transcript.set('');

    const token = this.auth.getAccessToken();
    if (!token) {
      this.error.set('Not authenticated');
      return;
    }

    try {
      const socket = new WebSocket(this.buildUrl(sourceId, token));
      socket.binaryType = 'arraybuffer';
      this.socket = socket;
      socket.addEventListener('message', (event) => this.handleMessage(event));

      await new Promise<void>((resolve, reject) => {
        socket.addEventListener('open', () => resolve(), { once: true });
        socket.addEventListener('error', () => reject(new Error('Connection error')), { once: true });
        socket.addEventListener('close', () => reject(new Error('Connection closed')), { once: true });
      });

      if (this.destroyed) {
        this.cleanup();
        return;
      }

      socket.addEventListener('close', () => this.stopRecording());
      socket.addEventListener('error', () => {
        this.error.set('Connection error');
        this.stopRecording();
      });

      this.capture = await startAudioCapture(
        (chunk) => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(chunk);
          }
        },
        () => this.stopRecording()
      );

      if (this.destroyed) {
        this.cleanup();
        return;
      }
      this.recording.set(true);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed to start recording');
      this.cleanup();
    }
  }

  stopRecording(): void {
    if (!this.recording() && !this.socket) {
      return;
    }
    this.cleanup();
    this.recording.set(false);
  }

  private handleMessage(event: MessageEvent): void {
    if (typeof event.data !== 'string') {
      return;
    }
    const message = JSON.parse(event.data) as TranscriptMessage;
    if (message.type === 'transcript' && message.text) {
      const text = message.text;
      this.transcript.update((current) => (current ? `${current} ${text}` : text));
    }
  }

  private buildUrl(sourceId: string, token: string): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const params = new URLSearchParams({ sourceId, token });
    return `${protocol}//${window.location.host}/api/ws/audio-stream?${params.toString()}`;
  }

  private cleanup(): void {
    this.capture?.stop();
    this.capture = null;
    if (this.socket) {
      const state = this.socket.readyState;
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
        this.socket.close();
      }
      this.socket = null;
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.cleanup();
  }
}
