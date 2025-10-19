import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchAudio } from '../../utils/fetchAudio';
import { AudioData } from '../types/audio-generation.types';

@Injectable({
  providedIn: 'root'
})
export class AudioPlaybackService {
  private readonly AUDIO_DELAY_MS = 500; // Fixed delay between audio files
  private currentAudioElements: HTMLAudioElement[] = [];
  private audioTimeouts: number[] = [];

  /**
   * Play a sequence of audio files with a delay between them
   * @param http HttpClient instance for fetching audio
   * @param audioEntries Array of AudioData entries to play
   */
  async playAudioSequence(
    http: HttpClient,
    audioEntries: AudioData[]
  ): Promise<void> {
    // Stop any current playback first
    this.stopPlayback();

    try {
      for (let i = 0; i < audioEntries.length; i++) {
        const audioUrl = await fetchAudio(
          http,
          `/api/audio/${audioEntries[i].id}`
        );
        const audio = new Audio(audioUrl);
        this.currentAudioElements.push(audio);

        // Play audio and wait for it to finish
        await this.playAudioAndWait(audio);

        // Add delay between audios except for the last one
        if (i < audioEntries.length - 1) {
          await this.delay(this.AUDIO_DELAY_MS);
        }
      }
    } catch (error) {
      console.warn('Error playing audio sequence:', error);
    } finally {
      this.currentAudioElements = [];
    }
  }

  /**
   * Play audio from text array by finding matching AudioData entries
   * @param http HttpClient instance for fetching audio
   * @param texts Array of text strings to play audio for
   * @param audioList Complete list of AudioData to search from
   * @param delayMs Delay in milliseconds between audio files (default: 1500ms for learn-card)
   */
  async playAudioForTexts(
    http: HttpClient,
    texts: string[],
    audioList: AudioData[],
    delayMs: number = 500
  ): Promise<void> {
    // Filter texts that have audio available
    const audioEntries = texts
      .map(text => this.getAudioForText(audioList, text))
      .filter((audio): audio is AudioData => audio !== undefined);

    if (audioEntries.length > 0) {
      await this.playAudioSequence(http, audioEntries);
    }
  }

  /**
   * Stop all current audio playback
   */
  stopPlayback(): void {
    // Stop all audio elements
    this.currentAudioElements.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.currentAudioElements = [];

    // Clear all timeouts
    this.audioTimeouts.forEach(timeout => clearTimeout(timeout));
    this.audioTimeouts = [];
  }

  /**
   * Find audio entry for a specific text
   */
  private getAudioForText(audioList: AudioData[], text: string): AudioData | undefined {
    return audioList.find(audio => audio.text === text && audio.selected);
  }

  /**
   * Play audio and wait for it to finish
   */
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

  /**
   * Create a delay promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const timeout = window.setTimeout(resolve, ms);
      this.audioTimeouts.push(timeout);
    });
  }
}
