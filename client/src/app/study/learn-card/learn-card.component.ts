import {
  Component,
  effect,
  inject,
  signal,
  computed,
  OnDestroy,
  HostListener,
  viewChild,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { StudySessionService } from '../../study-session.service';
import { injectParams } from '../../utils/inject-params';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { CardGradingButtonsComponent } from '../../shared/card-grading-buttons/card-grading-buttons.component';
import { CardActionsComponent } from '../../shared/card-actions/card-actions.component';
import { LearnVocabularyCardComponent } from '../learn-vocabulary-card/learn-vocabulary-card.component';
import { LearnSpeechCardComponent } from '../learn-speech-card/learn-speech-card.component';
import { LearnGrammarCardComponent } from '../learn-grammar-card/learn-grammar-card.component';
import { LearnCardSkeletonComponent } from '../learn-card-skeleton/learn-card-skeleton.component';
import { ConfettiComponent } from '../confetti/confetti.component';
import { AudioPlaybackService } from '../../shared/services/audio-playback.service';
import { Card, LanguageTexts, SessionStats } from '../../parser/types';
import { CardResourceLike } from '../../shared/types/card-resource.types';
import { CardTypeRegistry } from '../../cardTypes/card-type.registry';
import { SessionStatsComponent } from '../session-stats/session-stats.component';

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
    LearnSpeechCardComponent,
    LearnGrammarCardComponent,
    LearnCardSkeletonComponent,
    ConfettiComponent,
    SessionStatsComponent,
  ],
  templateUrl: './learn-card.component.html',
  styleUrl: './learn-card.component.css',
})
export class LearnCardComponent implements OnDestroy {
  private readonly routeSourceId = injectParams('sourceId');
  private readonly studySessionService = inject(StudySessionService);
  private readonly http = inject(HttpClient);
  private readonly audioPlaybackService = inject(AudioPlaybackService);
  private readonly cardTypeRegistry = inject(CardTypeRegistry);
  private lastPreparedCardId: string | null = null;

  private readonly gradingButtons = viewChild(CardGradingButtonsComponent);

  readonly currentCardData = this.studySessionService.currentCard;

  readonly cardResource: CardResourceLike = {
    value: () => this.currentCardData.value()?.card,
    isLoading: () => this.currentCardData.isLoading(),
  };

  readonly card = computed<Card | null | undefined>(() => {
    return this.currentCardData.value()?.card;
  });

  readonly isRevealed = signal(false);
  readonly hasSession = this.studySessionService.hasSession;
  readonly hasExistingSession = this.studySessionService.hasExistingSession;
  readonly isCheckingSession = signal(true);
  private readonly isGrading = signal(false);
  private lastPlayedTexts: string[] = [];
  private currentSourceId: string | null = null;

  readonly currentCardType = computed(() => this.card()?.source.cardType);

  readonly languageTexts = computed<LanguageTexts[]>(() => {
    const card = this.card();
    const cardType = this.currentCardType();
    if (!card || !cardType) return [];
    const strategy = this.cardTypeRegistry.getStrategy(cardType);
    return strategy.getLanguageTexts(card);
  });

  readonly isStudyingWithPartner = computed(() => {
    const cardData = this.currentCardData.value();
    return cardData?.studyMode === 'WITH_PARTNER';
  });

  readonly currentTurn = this.studySessionService.currentTurn;
  readonly cardShownAt = signal<number | null>(null);
  readonly sessionStats = signal<SessionStats | null>(null);

  constructor() {
    effect(() => {
      const sourceId = this.routeSourceId();
      if (sourceId) {
        const sourceChanged = this.currentSourceId !== null && this.currentSourceId !== String(sourceId);
        this.currentSourceId = String(sourceId);
        if (sourceChanged) {
          this.studySessionService.clearSession();
          this.isCheckingSession.set(true);
        }
        this.checkForExistingSession(String(sourceId));
      }
    });

    effect(() => {
      const card = this.card();
      if (card?.data.audio?.length && card.id !== this.lastPreparedCardId) {
        this.lastPreparedCardId = card.id;
        this.audioPlaybackService.prepareAudio(this.http, card.data.audio);
      }
    });

    effect(() => {
      const card = this.card();
      if (card) {
        this.cardShownAt.set(Date.now());
      }
    });

    effect(() => {
      const cardData = this.currentCardData.value();
      const isLoading = this.currentCardData.isLoading();
      const sourceId = this.currentSourceId;
      if (!isLoading && cardData === null && sourceId && this.hasSession()) {
        this.loadSessionStats(sourceId);
      }
    });
  }

  private async checkForExistingSession(sourceId: string) {
    this.isCheckingSession.set(true);
    try {
      await this.studySessionService.checkExistingSession(sourceId);
    } finally {
      this.isCheckingSession.set(false);
    }
  }

  async startSession() {
    if (this.currentSourceId) {
      await this.studySessionService.createSession(this.currentSourceId);
    }
  }

  private static readonly GRADE_BY_KEY = {
    'Red': 'Again',
    'Yellow': 'Hard',
    'Green': 'Good',
    'Blue': 'Easy',
  } as const satisfies Record<string, 'Again' | 'Hard' | 'Good' | 'Easy'>;

  @HostListener('document:keydown', ['$event'])
  async handleKeydown(event: KeyboardEvent) {
    if (!this.card()) return;

    const target = event.target as HTMLElement;
    const isInteractiveElement = target?.closest?.('button, a, input, select, textarea');

    if (event.key === 'Enter' && !isInteractiveElement && !this.isGrading()) {
      event.preventDefault();
      this.toggleReveal();
      return;
    }

    if (this.isRevealed() && !this.isGrading()) {
      const grade = LearnCardComponent.GRADE_BY_KEY[event.key as keyof typeof LearnCardComponent.GRADE_BY_KEY];
      if (grade) {
        event.preventDefault();
        this.isGrading.set(true);
        try {
          await this.gradingButtons()?.gradeCard(grade);
        } finally {
          this.isGrading.set(false);
        }
      }
    }
  }

  ngOnDestroy() {
    this.audioPlaybackService.releasePrepared();
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
    await this.audioPlaybackService.playAudioForTexts(texts);
  }

  toggleReveal() {
    this.isRevealed.update((revealed) => !revealed);
  }

  private async loadSessionStats(sourceId: string) {
    const stats = await this.studySessionService.fetchSessionStats(sourceId);
    this.sessionStats.set(stats);
  }

  onCardProcessed() {
    this.isRevealed.set(false);
    this.lastPlayedTexts = [];
    this.lastPreparedCardId = null;
    this.cardShownAt.set(null);
    this.audioPlaybackService.releasePrepared();
    this.studySessionService.refreshSession();
  }
}
