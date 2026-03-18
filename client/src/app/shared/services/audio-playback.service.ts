import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchAudio } from '../../utils/fetchAudio';
import { AudioData } from '../types/audio-generation.types';

@Injectable({
  providedIn: 'root'
})
export class AudioPlaybackService {
  private readonly AUDIO_DELAY_MS = 500;
  private currentAudioElements: HTMLAudioElement[] = [];
  private audioTimeouts: number[] = [];
  private readonly audioCache = new Map<string, Promise<string>>();

  prefetchAudio(http: HttpClient, audioEntries: AudioData[]): void {
    audioEntries
      .map(entry => `/api/audio/${entry.id}`)
      .filter(url => !this.audioCache.has(url))
      .forEach(url => this.audioCache.set(url, fetchAudio(http, url)));
  }

  async clearCache(): Promise<void> {
    await Promise.all(
      [...this.audioCache.values()].map(p =>
        p.then(url => URL.revokeObjectURL(url)).catch(() => {})
      )
    );
    this.audioCache.clear();
  }

  async playAudioSequence(
    http: HttpClient,
    audioEntries: AudioData[]
  ): Promise<void> {
    this.stopPlayback();

    try {
      await audioEntries.reduce(async (prev, entry, i) => {
        await prev;
        const url = `/api/audio/${entry.id}`;
        const audioUrl = await (this.audioCache.get(url) ?? fetchAudio(http, url));
        const audio = new Audio(audioUrl);
        this.currentAudioElements = [...this.currentAudioElements, audio];

        await this.playAudioAndWait(audio);

        if (i < audioEntries.length - 1) {
          await this.delay(this.AUDIO_DELAY_MS);
        }
      }, Promise.resolve());
    } catch (error) {
      console.warn('Error playing audio sequence:', error);
    } finally {
      this.currentAudioElements = [];
    }
  }

  async playAudioForTexts(
    http: HttpClient,
    texts: string[],
    audioList: AudioData[],
    delayMs: number = 500
  ): Promise<void> {
    const audioEntries = texts
      .map(text => this.getAudioForText(audioList, text))
      .filter((audio): audio is AudioData => audio !== undefined);

    if (audioEntries.length > 0) {
      await this.playAudioSequence(http, audioEntries);
    }
  }

  stopPlayback(): void {
    this.currentAudioElements.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.currentAudioElements = [];

    this.audioTimeouts.forEach(timeout => clearTimeout(timeout));
    this.audioTimeouts = [];
  }

  private getAudioForText(audioList: AudioData[], text: string): AudioData | undefined {
    return audioList.find(audio => audio.text === text && audio.selected);
  }

  private async playAudioAndWait(audio: HTMLAudioElement): Promise<void> {
    return new Promise<void>((resolve) => {
      const handleEnd = () => {
        audio.removeEventListener('ended', handleEnd);
        audio.removeEventListener('error', handleError);
        resolve();
      };

      const handleError = () => {
        console.warn('Audio playback error');
        audio.removeEventListener('ended', handleEnd);
        audio.removeEventListener('error', handleError);
        resolve();
      };

      audio.addEventListener('ended', handleEnd);
      audio.addEventListener('error', handleError);

      audio.play().catch((error) => {
        console.warn('Audio playback failed:', error);
        handleError();
      });
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const timeout = window.setTimeout(resolve, ms);
      this.audioTimeouts.push(timeout);
    });
  }
}
