import { Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FsrsGradingService } from '../../fsrs-grading.service';
import { StudySessionService } from '../../study-session.service';
import { CardResourceLike } from '../types/card-resource.types';

type Grade = 'Again' | 'Good';

@Component({
  selector: 'app-card-grading-buttons',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './card-grading-buttons.component.html',
  styleUrl: './card-grading-buttons.component.css',
})
export class CardGradingButtonsComponent {
  card = input<CardResourceLike | null>(null);
  sourceId = input<string | null>(null);
  learningPartnerId = input<number | null>(null);
  reviewDuration = input<number | null>(null);
  cardProcessed = output<void>();

  private readonly fsrsGradingService = inject(FsrsGradingService);
  private readonly studySessionService = inject(StudySessionService);

  async gradeCard(grade: Grade) {
    const cardData = this.card()?.value();
    if (!cardData) return;

    try {
      await this.fsrsGradingService.gradeCard(cardData, grade, this.learningPartnerId(), this.reviewDuration());
      this.card()?.reload?.();
      this.cardProcessed.emit();
    } catch (error) {
      console.error('Error grading card:', error);
    }
  }

  async skipCard() {
    const cardData = this.card()?.value();
    const sourceId = this.sourceId();
    if (!cardData || !sourceId) return;

    try {
      await this.studySessionService.skipCard(sourceId, cardData.id);
      this.cardProcessed.emit();
    } catch (error) {
      console.error('Error skipping card:', error);
    }
  }
}
