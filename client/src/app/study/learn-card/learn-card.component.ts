import {
  Component,
  inject,
  signal,
  computed,
  OnDestroy,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MostDueCardService } from '../../most-due-card.service';
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
  private readonly mostDueCardService = inject(MostDueCardService);
  private readonly http = inject(HttpClient);
  private readonly audioPlaybackService = inject(AudioPlaybackService);
  private readonly learningPartnersService = inject(LearningPartnersService);
  readonly card = this.mostDueCardService.card;
  readonly studySettings = this.learningPartnersService.studySettings;

  readonly isRevealed = signal(false);
  private lastPlayedTexts: string[] = [];
  readonly languageTexts = signal<LanguageTexts[]>([]);
  readonly cardIndex = signal(0);

  readonly isStudyingWithPartner = computed(() => {
    const settings = this.studySettings.value();
    return settings?.studyMode === 'WITH_PARTNER' && (settings?.enabledPartners?.length ?? 0) > 0;
  });

  readonly currentPresenter = computed<{ name: string; partnerId: number | null }>(() => {
    if (!this.isStudyingWithPartner()) {
      return { name: 'Myself', partnerId: null };
    }

    const partners = this.studySettings.value()?.enabledPartners ?? [];
    const allPresenters: { name: string; partnerId: number | null }[] = [
      { name: 'Myself', partnerId: null },
      ...partners.map((p) => ({ name: p.name, partnerId: p.id })),
    ];

    const index = this.cardIndex() % allPresenters.length;
    return allPresenters[index];
  });

  constructor() {
    this.route.params.subscribe((params) => {
      params['sourceId'] &&
        this.mostDueCardService.setSelectedSourceId(params['sourceId']);
    });
  }

  ngOnDestroy() {
    // Clean up audio when component is destroyed
    this.audioPlaybackService.stopPlayback();
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
    const audioList = this.card.value()?.data.audio;
    if (!audioList || audioList.length === 0) return;

    // Use the shared service to play audio
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
    // Reset last played texts when card changes
    this.lastPlayedTexts = [];
    // Stop any ongoing audio playback
    this.audioPlaybackService.stopPlayback();
    // Increment card index for partner alternation
    this.cardIndex.update((i) => i + 1);
  }

  onLanguageTextsReady(texts: LanguageTexts[]) {
    this.languageTexts.set(texts);
  }
}
