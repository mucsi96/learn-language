import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchAudio } from '../../utils/fetchAudio';
import { AudioData } from '../types/audio-generation.types';

type PreparedAudio = {
  readonly text: string;
  readonly element: HTMLAudioElement;
  readonly blobUrl: string;
};

@Injectable({
  providedIn: 'root'
})
export class AudioPlaybackService {
  private currentAudioElements: HTMLAudioElement[] = [];
  private preparedAudios: PreparedAudio[] = [];

  prepareAudio(http: HttpClient, audioEntries: AudioData[]): void {
    this.releasePrepared();

    const selected = audioEntries.filter(entry => entry.selected && entry.text);
    selected.forEach(entry => {
      const url = `/api/audio/${entry.id}`;
      fetchAudio(http, url).then(blobUrl => {
        const element = new Audio(blobUrl);
        element.load();
        this.preparedAudios = [
          ...this.preparedAudios,
          { text: entry.text!, element, blobUrl },
        ];
      }).catch(err => console.warn('Failed to prepare audio:', err));
    });
  }

  async playAudioForTexts(texts: string[]): Promise<void> {
    this.stopPlayback();

    const audioEntries = texts
      .map(text => this.preparedAudios.find(a => a.text === text))
      .filter((a): a is PreparedAudio => a !== undefined);

    if (audioEntries.length === 0) return;

    try {
      await audioEntries.reduce(async (prev, prepared) => {
        await prev;
        this.currentAudioElements = [...this.currentAudioElements, prepared.element];
        await this.playAudioAndWait(prepared.element);
      }, Promise.resolve());
    } catch (error) {
      console.warn('Error playing audio sequence:', error);
    } finally {
      this.currentAudioElements = [];
    }
  }

  async playAudioSequence(
    http: HttpClient,
    audioEntries: AudioData[]
  ): Promise<void> {
    this.stopPlayback();

    try {
      await audioEntries.reduce(async (prev, entry) => {
        await prev;
        const url = `/api/audio/${entry.id}`;
        const audioUrl = await fetchAudio(http, url);
        const audio = new Audio(audioUrl);
        this.currentAudioElements = [...this.currentAudioElements, audio];
        await this.playAudioAndWait(audio);
        URL.revokeObjectURL(audioUrl);
      }, Promise.resolve());
    } catch (error) {
      console.warn('Error playing audio sequence:', error);
    } finally {
      this.currentAudioElements = [];
    }
  }

  stopPlayback(): void {
    this.currentAudioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.currentAudioElements = [];
  }

  releasePrepared(): void {
    this.stopPlayback();
    this.preparedAudios.forEach(a => URL.revokeObjectURL(a.blobUrl));
    this.preparedAudios = [];
  }

  private async playAudioAndWait(audio: HTMLAudioElement): Promise<void> {
    audio.currentTime = 0;
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
}
