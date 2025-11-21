import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { GrammarCardCreationStrategy } from '../card-creation-strategies/grammar-card-creation.strategy';
import { CardService } from '../card.service';
import { PageService } from '../page.service';

interface DialogData {
  sentence: string;
  sourceId: string;
  pageNumber: number;
}

@Component({
  selector: 'app-grammar-card-creation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressBarModule,
    MatIconModule,
  ],
  templateUrl: './grammar-card-creation-dialog.component.html',
  styleUrl: './grammar-card-creation-dialog.component.css',
})
export class GrammarCardCreationDialogComponent {
  readonly data = inject<DialogData>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<GrammarCardCreationDialogComponent>);
  readonly grammarStrategy = inject(GrammarCardCreationStrategy);
  readonly cardService = inject(CardService);
  readonly pageService = inject(PageService);

  words: string[] = [];
  maskedIndices: Set<number> = new Set();
  isCreating = false;
  progress = 0;
  currentStep = '';
  error: string | null = null;

  constructor() {
    this.words = this.data.sentence.split(/\s+/).filter(w => w.length > 0);
  }

  toggleWordMask(index: number): void {
    if (this.maskedIndices.has(index)) {
      this.maskedIndices.delete(index);
    } else {
      this.maskedIndices.add(index);
    }
  }

  isWordMasked(index: number): boolean {
    return this.maskedIndices.has(index);
  }

  get maskedSentence(): string {
    return this.words.map((word, index) => 
      this.isWordMasked(index) ? '___' : word
    ).join(' ');
  }

  get fullSentence(): string {
    return this.words.join(' ');
  }

  async createCard(): Promise<void> {
    if (this.maskedIndices.size === 0) {
      this.error = 'Please select at least one word to mask';
      return;
    }

    this.isCreating = true;
    this.error = null;

    try {
      const cardData = await this.grammarStrategy.createCardData(
        {
          sentence: this.fullSentence,
          sourceId: this.data.sourceId,
          pageNumber: this.data.pageNumber,
          cardType: 'grammar',
        },
        (progress, step) => {
          this.progress = progress;
          this.currentStep = step;
        }
      );

      cardData.maskedIndices = Array.from(this.maskedIndices).sort((a, b) => a - b);

      await this.cardService.createCard(
        this.data.sourceId,
        this.data.pageNumber,
        cardData
      );

      this.pageService.reload();
      this.dialogRef.close();
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to create card';
      this.isCreating = false;
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
