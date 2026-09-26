import { Injectable, signal } from '@angular/core';

export interface YouTubePlayer {
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  cueVideoById(options: { videoId: string; startSeconds: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
}

interface PlayerEvent { target: YouTubePlayer; data: number; }
interface YouTubeApi {
  Player: new (element: HTMLElement, options: {
    host: string;
    videoId: string;
    width: string;
    height: string;
    playerVars: Record<string, string | number>;
    events: {
      onReady: (event: PlayerEvent) => void;
      onStateChange: (event: PlayerEvent) => void;
      onError: (event: PlayerEvent) => void;
    };
  }) => YouTubePlayer;
}

type YouTubeWindow = Window & { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void };

@Injectable({ providedIn: 'root' })
export class YouTubePlayerApiService {
  private readonly loading = signal<Promise<YouTubeApi> | null>(null);

  load(): Promise<YouTubeApi> {
    const target = window as YouTubeWindow;
    if (target.YT?.Player) return Promise.resolve(target.YT);
    const existing = this.loading();
    if (existing) return existing;
    const promise = new Promise<YouTubeApi>((resolve, reject) => {
      const script = document.createElement('script');
      const timeout = setTimeout(() => fail(), 20000);
      const fail = () => {
        clearTimeout(timeout);
        script.remove();
        reject(new Error('YouTube player could not be loaded. Check your connection and retry.'));
      };
      const previous = target.onYouTubeIframeAPIReady;
      target.onYouTubeIframeAPIReady = () => {
        previous?.();
        clearTimeout(timeout);
        if (!target.YT?.Player) return fail();
        resolve(target.YT);
      };
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = fail;
      document.head.appendChild(script);
    }).catch(error => {
      this.loading.set(null);
      throw error;
    });
    this.loading.set(promise);
    return promise;
  }
}
