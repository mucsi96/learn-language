import { Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FsrsGradingService } from '../../fsrs-grading.service';

type Grade = 'Again' | 'Hard' | 'Good' | 'Easy';

@Component({
  selector: 'app-card-grading-buttons',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './card-grading-buttons.component.html',
  styleUrl: './card-grading-buttons.component.css',
})
export class CardGradingButtonsComponent {
  card = input<any>(null);
  graded = output<Grade>();
  cardProcessed = output<void>();

  private readonly fsrsGradingService = inject(FsrsGradingService);

  async gradeCard(grade: Grade) {
    const cardData = this.card()?.value();
    if (!cardData) return;

    try {
      await this.fsrsGradingService.gradeCard(cardData, grade);
      // Reload the card resource to get the next card
      this.card()?.reload();
      this.cardProcessed.emit();
    } catch (error) {
      console.error('Error grading card:', error);
    }
  }
}
