import { Component, inject } from '@angular/core';
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
      selectedSource.pageNumber
    );

    if (result.successfulCards > 0) {
      this.pageService.reload();
    }
  }
}
