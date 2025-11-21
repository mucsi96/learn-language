import { Component, inject, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { WordsWithoutCardsService } from '../words-without-cards.service';
import { BulkCardCreationService } from '../bulk-card-creation.service';
import { BulkCreationProgressDialogComponent } from '../bulk-creation-progress-dialog/bulk-creation-progress-dialog.component';
import { PageService } from '../page.service';
import { GrammarCardCreationDialogComponent } from '../grammar-card-creation-dialog/grammar-card-creation-dialog.component';

@Component({
  selector: 'app-bulk-card-creation-fab',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatBadgeModule],
  templateUrl: './bulk-card-creation-fab.component.html',
  styleUrl: './bulk-card-creation-fab.component.css',
})
export class BulkCardCreationFabComponent {
  readonly wordsService = inject(WordsWithoutCardsService);
  readonly bulkCreationService = inject(BulkCardCreationService);
  readonly pageService = inject(PageService);
  readonly dialog = inject(MatDialog);
  readonly snackBar = inject(MatSnackBar);

  hasSelectedText = computed(() => {
    const regions = this.pageService.selectionRegions();
    return regions.length > 0 && regions.some(r => r.value()?.words && r.value()!.words.length > 0);
  });

  async startBulkCreation(): Promise<void> {
    const words = this.wordsService.wordsWithoutCards();
    const selectedSource = this.pageService['selectedSource']();

    if (!selectedSource || words.length === 0) {
      return;
    }

    this.bulkCreationService.clearProgress();

    this.dialog.open(BulkCreationProgressDialogComponent, {
      data: { words: words.map((w) => w.word) },
      disableClose: true,
      // width: '100vw',
      maxWidth: '100vw',
      maxHeight: '100vh',
    });

    const result = await this.bulkCreationService.createCardsInBulk(
      words,
      selectedSource.sourceId,
      selectedSource.pageNumber,
      'vocabulary'  // For now, default to vocabulary cards
    );

    if (result.successfulCards > 0) {
      this.pageService.reload();
    }
  }

  startGrammarCardCreation(): void {
    const selectedSource = this.pageService['selectedSource']();
    const regions = this.pageService.selectionRegions();

    if (!selectedSource || regions.length === 0) {
      return;
    }

    const words = regions
      .flatMap(r => r.value()?.words || [])
      .map(w => w.word);

    const sentence = words.join(' ');

    this.dialog.open(GrammarCardCreationDialogComponent, {
      data: {
        sentence,
        sourceId: selectedSource.sourceId,
        pageNumber: selectedSource.pageNumber,
      },
      width: '600px',
      maxWidth: '90vw',
    });
  }
}
