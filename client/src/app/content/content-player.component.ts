import { Component, ElementRef, HostListener, OnDestroy, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { HttpErrorResponse } from '@angular/common/http';
import { ContentItem, Playback, PlaybackSnapshot, formatPosition } from './content.types';
import { ContentService, ProgressWrite, contentError } from './content.service';
import { YouTubePlayerComponent } from './youtube-player.component';

@Component({
  selector: 'app-content-player',
  imports: [MatButtonModule, YouTubePlayerComponent],
  templateUrl: './content-player.component.html',
  styleUrl: './content-player.component.css',
})
export class ContentPlayerComponent implements OnDestroy {
  readonly sourceId = input.required<string>();
  readonly item = input.required<ContentItem>();
  private readonly service = inject(ContentService);
  private readonly audio = viewChild<ElementRef<HTMLAudioElement>>('audio');
  private readonly youtube = viewChild(YouTubePlayerComponent);
  private readonly sequence = signal(0);
  private readonly writes = signal<Promise<void>>(Promise.resolve());
  private readonly lastSnapshot = signal<PlaybackSnapshot | undefined>(undefined);
  private readonly localKey = computed(() => `content-progress:${this.sourceId()}:${this.item().id}`);
  readonly playback = signal<Playback | null>(null);
  readonly position = signal(0);
  readonly duration = signal(0);
  readonly paused = signal(true);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly saved = signal(false);
  readonly formatPosition = formatPosition;
  readonly canPlay = computed(() => this.playback()?.kind === 'youtube'
    ? this.youtube()?.ready() === true : this.duration() > 0);

  constructor() {
    effect(onCleanup => {
      if (!this.playback()) return;
      const timer = setInterval(() => {
        if (this.snapshot()?.paused === false) this.save();
      }, 5000);
      onCleanup(() => clearInterval(timer));
    });
  }

  async start(restart = false): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const pending = localStorage.getItem(this.localKey());
      if (pending) {
        await this.service.saveProgress(this.sourceId(), this.item().id, JSON.parse(pending)).catch(error => {
          if (!(error instanceof HttpErrorResponse) || error.status !== 409) throw error;
        });
      }
      const playback = await this.service.playback(this.sourceId(), this.item().id);
      localStorage.removeItem(this.localKey());
      this.sequence.set(0);
      this.lastSnapshot.set(undefined);
      this.position.set(restart ? 0 : playback.progress.position);
      this.duration.set(playback.progress.duration);
      this.paused.set(true);
      this.playback.set(restart ? { ...playback, progress: { ...playback.progress, position: 0, completed: false } } : playback);
    } catch (error) {
      this.error.set(contentError(error));
    } finally {
      this.busy.set(false);
    }
  }

  loaded(): void {
    const audio = this.audio()!.nativeElement;
    const playback = this.playback()!;
    this.duration.set(audio.duration);
    audio.currentTime = Math.min(playback.progress.position, audio.duration);
    this.position.set(audio.currentTime);
  }

  async toggle(): Promise<void> {
    if (this.playback()?.kind === 'youtube') {
      if (this.paused()) this.youtube()?.play();
      else this.youtube()?.pause();
      return;
    }
    const audio = this.audio()!.nativeElement;
    if (audio.paused) {
      await audio.play().catch(error => this.error.set(contentError(error)));
    } else {
      audio.pause();
    }
  }

  updatePosition(): void {
    const snapshot = this.snapshot();
    if (snapshot) this.videoChanged(snapshot);
  }

  seek(event: Event): void {
    this.audio()!.nativeElement.currentTime = Number((event.target as HTMLInputElement).value);
    this.updatePosition();
    this.save();
  }

  save(snapshot = this.snapshot()): void {
    const playback = this.playback();
    if (!snapshot || !playback || !Number.isFinite(snapshot.duration) || snapshot.duration <= 0) return;
    this.lastSnapshot.set(snapshot);
    this.sequence.update(sequence => sequence + 1);
    const body: ProgressWrite = {
      sessionId: playback.sessionId, sequence: this.sequence(), position: snapshot.position,
      duration: snapshot.duration, completed: snapshot.completed,
    };
    const key = this.localKey();
    const serialized = JSON.stringify(body);
    const sourceId = this.sourceId();
    const contentId = this.item().id;
    localStorage.setItem(key, serialized);
    this.saved.set(false);
    const next = this.writes().then(async () => {
      try {
        await this.service.saveProgress(sourceId, contentId, body);
        if (localStorage.getItem(key) === serialized) localStorage.removeItem(key);
        if (this.playback()?.sessionId !== body.sessionId) return;
        this.saved.set(true);
        this.error.set(null);
      } catch (error) {
        if (this.playback()?.sessionId !== body.sessionId) return;
        this.error.set(`Progress could not be saved: ${contentError(error)}`);
        if (error instanceof HttpErrorResponse && [401, 403, 409, 423].includes(error.status)) {
          this.youtube()?.pause();
          this.audio()?.nativeElement.pause();
          this.playback.set(null);
        }
      }
    });
    this.writes.set(next);
  }

  videoChanged(snapshot: PlaybackSnapshot): void {
    this.lastSnapshot.set(snapshot);
    this.position.set(snapshot.position);
    this.duration.set(snapshot.duration);
    this.paused.set(snapshot.paused);
  }

  private snapshot(): PlaybackSnapshot | undefined {
    if (this.playback()?.kind === 'youtube') return this.youtube()?.snapshot();
    const audio = this.audio()?.nativeElement;
    return audio ? { position: audio.currentTime, duration: audio.duration, paused: audio.paused, completed: audio.ended } : undefined;
  }

  @HostListener('document:visibilitychange')
  @HostListener('window:pagehide')
  onPageHidden(): void { this.save(); }

  ngOnDestroy(): void {
    this.save(this.snapshot() ?? this.lastSnapshot());
    this.youtube()?.pause();
    this.audio()?.nativeElement.pause();
  }
}
