import {
  Component,
  inject,
  signal,
  computed,
  OnDestroy,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { StudyDeckService } from '../../study-deck.service';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { CardGradingButtonsComponent } from '../../shared/card-grading-buttons/card-grading-buttons.component';
import { CardActionsComponent } from '../../shared/card-actions/card-actions.component';
import { LearnVocabularyCardComponent } from '../learn-vocabulary-card/learn-vocabulary-card.component';
import { LearnCardSkeletonComponent } from '../learn-card-skeleton/learn-card-skeleton.component';
import { AudioPlaybackService } from '../../shared/services/audio-playback.service';
import { LanguageTexts } from '../../shared/voice-selection-dialog/voice-selection-dialog.component';
import { LearningPartnersService } from '../../learning-partners/learning-partners.service';

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
export class LearnCardComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly studyDeckService = inject(StudyDeckService);
  private readonly http = inject(HttpClient);
  private readonly audioPlaybackService = inject(AudioPlaybackService);
  private readonly learningPartnersService = inject(LearningPartnersService);

  readonly card = this.studyDeckService.card;
  readonly deck = this.studyDeckService.deck;
  readonly studySettings = this.learningPartnersService.studySettings;

  readonly isRevealed = signal(false);
  private lastPlayedTexts: string[] = [];
  readonly languageTexts = signal<LanguageTexts[]>([]);

  readonly isStudyingWithPartner = computed(() => {
    const settings = this.studySettings.value();
    return settings?.studyMode === 'WITH_PARTNER' && (settings?.enabledPartners?.length ?? 0) > 0;
  });

  readonly currentPresenter = this.studyDeckService.currentPresenter;

  constructor() {
    this.route.params.subscribe((params) => {
      params['sourceId'] &&
        this.studyDeckService.setSelectedSourceId(params['sourceId']);
    });
  }

  ngOnDestroy() {
    this.audioPlaybackService.stopPlayback();
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
    const audioList = this.card.value()?.data.audio;
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
    this.studyDeckService.advanceToNextCard();
  }

  onLanguageTextsReady(texts: LanguageTexts[]) {
    this.languageTexts.set(texts);
  }
}
