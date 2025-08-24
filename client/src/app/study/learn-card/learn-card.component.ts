import {
  Component,
  inject,
  signal,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MostDueCardService } from '../../most-due-card.service';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { fetchAudio } from '../../utils/fetchAudio';
import { CardGradingButtonsComponent } from '../../shared/card-grading-buttons/card-grading-buttons.component';
import { CardActionsComponent } from '../../shared/card-actions/card-actions.component';
import { LearnVocabularyCardComponent } from '../learn-vocabulary-card/learn-vocabulary-card.component';
import { LearnCardSkeletonComponent } from '../learn-card-skeleton/learn-card-skeleton.component';

@Component({
  selector: 'app-learn-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    CardGradingButtonsComponent,
    CardActionsComponent,
    LearnVocabularyCardComponent,
    LearnCardSkeletonComponent,
  ],
  templateUrl: './learn-card.component.html',
  styleUrl: './learn-card.component.css',
})
export class LearnCardComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly mostDueCardService = inject(MostDueCardService);
  private readonly http = inject(HttpClient);
  readonly card = this.mostDueCardService.card;

  readonly isRevealed = signal(false);
  private currentAudio: HTMLAudioElement | null = null;
  private audioTimeout: number | null = null;
  private lastPlayedTexts: string[] = [];

  constructor() {
    this.route.params.subscribe((params) => {
      params['sourceId'] &&
        this.mostDueCardService.setSelectedSourceId(params['sourceId']);
    });
  }

  // Public method for child components to trigger audio playback
  playAudioForContent(texts: string[]) {
    // Check if the same texts are being requested
    const textsChanged = texts.length !== this.lastPlayedTexts.length ||
                        texts.some((text, index) => text !== this.lastPlayedTexts[index]);

    if (!textsChanged) {
      return;
    }

    if (texts.length > 0) {
      this.lastPlayedTexts = [...texts];
      this.playAudioSequence(texts);
    }
  }

  private async playAudioSequence(texts: string[]) {
    const audioMap = this.card.value()?.data.audio;
    if (!audioMap) return;

    // Stop any current audio playback first
    this.stopCurrentAudio();

    // Filter texts that have audio available
    const textsWithAudio = texts.filter(text => text && audioMap[text]);
    if (textsWithAudio.length === 0) return;

    // Play audio sequentially, waiting for each to finish before scheduling the next
    for (let i = 0; i < textsWithAudio.length; i++) {
      await this.playAudio(audioMap[textsWithAudio[i]]);

      // Schedule next audio after a delay, but only if there's a next one
      if (i < textsWithAudio.length - 1) {
        await new Promise(resolve => {
          this.audioTimeout = window.setTimeout(resolve, 1500); // 1.5 second delay
        });
      }
    }
  }

  private async playAudio(audioId: string) {
    try {
      const audioUrl = await fetchAudio(this.http, `/api/audio/${audioId}`);
      this.currentAudio = new Audio(audioUrl);
      await this.currentAudio
        .play()
        .catch((error) => console.warn('Audio playback failed:', error));
    } catch (error) {
      console.warn('Error loading audio:', error);
    }
  }

  private stopCurrentAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    // Clear audio timeout
    if (this.audioTimeout) {
      clearTimeout(this.audioTimeout);
      this.audioTimeout = null;
    }
  }

  toggleReveal() {
    this.isRevealed.update((revealed) => !revealed);
  }

  onCardProcessed() {
    this.isRevealed.set(false);
    // Reset last played texts when card changes
    this.lastPlayedTexts = [];
  }
}
