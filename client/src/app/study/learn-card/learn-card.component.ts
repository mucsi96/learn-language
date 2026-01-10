import {
  Component,
  inject,
  signal,
  computed,
  OnDestroy,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { StudySessionService } from '../../study-session.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { CardGradingButtonsComponent } from '../../shared/card-grading-buttons/card-grading-buttons.component';
import { CardActionsComponent } from '../../shared/card-actions/card-actions.component';
import { LearnVocabularyCardComponent } from '../learn-vocabulary-card/learn-vocabulary-card.component';
import { LearnCardSkeletonComponent } from '../learn-card-skeleton/learn-card-skeleton.component';
import { AudioPlaybackService } from '../../shared/services/audio-playback.service';
import { LanguageTexts } from '../../shared/voice-selection-dialog/voice-selection-dialog.component';
import { Card } from '../../parser/types';
import { CardResourceLike } from '../../shared/types/card-resource.types';

@Component({
  selector: 'app-learn-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    CardGradingButtonsComponent,
    CardActionsComponent,
    LearnVocabularyCardComponent,
    LearnCardSkeletonComponent,
  ],
  templateUrl: './learn-card.component.html',
  styleUrl: './learn-card.component.css',
})
export class LearnCardComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly studySessionService = inject(StudySessionService);
  private readonly http = inject(HttpClient);
  private readonly audioPlaybackService = inject(AudioPlaybackService);

  readonly currentCardData = this.studySessionService.currentCard;

  readonly cardResource: CardResourceLike = {
    value: () => this.currentCardData.value()?.card,
    isLoading: () => this.currentCardData.isLoading(),
  };

  readonly card = computed<Card | null | undefined>(() => {
    return this.currentCardData.value()?.card;
  });

  readonly isRevealed = signal(false);
  readonly sessionId = signal<string | null>(null);
  private lastPlayedTexts: string[] = [];
  readonly languageTexts = signal<LanguageTexts[]>([]);
  private currentSourceId: string | null = null;

  readonly isStudyingWithPartner = computed(() => {
    const cardData = this.currentCardData.value();
    return cardData?.studyMode === 'WITH_PARTNER';
  });

  readonly currentTurn = this.studySessionService.currentTurn;

  constructor() {
    this.route.queryParams.subscribe((queryParams) => {
      const urlSessionId = queryParams['session'];
      if (urlSessionId && urlSessionId !== this.sessionId()) {
        this.sessionId.set(urlSessionId);
        this.studySessionService.setSessionId(urlSessionId);
      } else if (!urlSessionId && this.sessionId()) {
        this.sessionId.set(null);
        this.studySessionService.clearSession();
      }
    });

    this.route.params.subscribe((params) => {
      if (params['sourceId']) {
        const sourceChanged = this.currentSourceId !== null && this.currentSourceId !== params['sourceId'];
        this.currentSourceId = params['sourceId'];
        if (sourceChanged) {
          this.sessionId.set(null);
          this.studySessionService.clearSession();
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { session: null },
            queryParamsHandling: 'merge',
          });
        }
      }
    });
  }

  async startSession() {
    if (this.currentSourceId) {
      const session = await this.studySessionService.createSession(this.currentSourceId);
      if (session) {
        this.sessionId.set(session.sessionId);
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { session: session.sessionId },
          queryParamsHandling: 'merge',
        });
      }
    }
  }

  ngOnDestroy() {
    this.audioPlaybackService.stopPlayback();
    this.studySessionService.clearSession();
  }

  playAudioForContent(texts: string[]) {
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
    const audioList = this.card()?.data.audio;
    if (!audioList || audioList.length === 0) return;

    await this.audioPlaybackService.playAudioForTexts(
      this.http,
      texts,
      audioList
    );
  }

  toggleReveal() {
    this.isRevealed.update((revealed) => !revealed);
  }

  onCardProcessed() {
    this.isRevealed.set(false);
    this.lastPlayedTexts = [];
    this.audioPlaybackService.stopPlayback();
    this.studySessionService.refreshSession();
  }

  onLanguageTextsReady(texts: LanguageTexts[]) {
    this.languageTexts.set(texts);
  }
}
