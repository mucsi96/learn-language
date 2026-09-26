import { Component, ElementRef, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { PlaybackSnapshot } from './content.types';
import { YouTubePlayer, YouTubePlayerApiService } from './youtube-player-api.service';

@Component({
  selector: 'app-youtube-player',
  imports: [MatButtonModule],
  templateUrl: './youtube-player.component.html',
  styleUrl: './youtube-player.component.css',
})
export class YouTubePlayerComponent {
  readonly videoId = input.required<string>();
  readonly startPosition = input.required<number>();
  readonly changed = output<PlaybackSnapshot>();
  readonly checkpoint = output<void>();
  private readonly api = inject(YouTubePlayerApiService);
  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private readonly player = signal<YouTubePlayer | null>(null);
  readonly ready = signal(false);
  private readonly retry = signal(0);
  private readonly previous = signal<PlaybackSnapshot | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(onCleanup => {
      const videoId = this.videoId();
      const start = this.startPosition();
      this.retry();
      const cancelled = signal(false);
      const element = document.createElement('div');
      this.host().nativeElement.replaceChildren(element);
      void untracked(() => this.api.load()).then(api => {
        if (cancelled()) return;
        this.player.set(new api.Player(element, {
          host: 'https://www.youtube-nocookie.com', videoId, width: '100%', height: '100%',
          playerVars: { origin: window.location.origin, playsinline: 1, controls: 1, rel: 0, enablejsapi: 1 },
          events: {
            onReady: event => {
              if (cancelled() || this.ready()) return;
              this.ready.set(true);
              event.target.cueVideoById({ videoId, startSeconds: start });
            },
            onStateChange: event => {
              if (cancelled()) return;
              this.refresh();
              if (event.data === 0 || event.data === 2) this.checkpoint.emit();
            },
            onError: event => {
              if (cancelled()) return;
              this.error.set(`This YouTube recording is unavailable or cannot be embedded (code ${event.data}).`);
            },
          },
        }));
      }).catch(error => { if (!cancelled()) this.error.set(error.message); });
      const timer = setInterval(() => this.refresh(), 1000);
      onCleanup(() => {
        cancelled.set(true);
        clearInterval(timer);
        this.ready.set(false);
        this.player()?.destroy();
        this.player.set(null);
        this.previous.set(null);
      });
    });
  }

  snapshot(): PlaybackSnapshot | undefined {
    const player = this.player();
    if (!player || !this.ready()) return undefined;
    const state = player.getPlayerState();
    if (state === -1 || state === 5) return undefined;
    return { position: player.getCurrentTime(), duration: player.getDuration(), paused: state !== 1, completed: state === 0 };
  }

  pause(): void { this.player()?.pauseVideo(); }
  play(): void { this.player()?.playVideo(); }

  retryPlayer(): void {
    this.error.set(null);
    this.retry.update(attempt => attempt + 1);
  }

  private refresh(): void {
    const snapshot = this.snapshot();
    if (!snapshot || !Number.isFinite(snapshot.duration) || snapshot.duration <= 0) return;
    const previous = this.previous();
    this.previous.set(snapshot);
    this.changed.emit(snapshot);
    if (previous && Math.abs(snapshot.position - previous.position) > 2) this.checkpoint.emit();
  }
}
