import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { CardCandidatesService } from '../card-candidates.service';
import { BulkCardCreationService } from '../bulk-card-creation.service';
import { BulkCreationProgressDialogComponent } from '../bulk-creation-progress-dialog/bulk-creation-progress-dialog.component';
import { PageService } from '../page.service';
import { fetchJson } from '../utils/fetchJson';

@Component({
  selector: 'app-bulk-card-creation-fab',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatBadgeModule],
  templateUrl: './bulk-card-creation-fab.component.html',
  styleUrl: './bulk-card-creation-fab.component.css',
})
export class BulkCardCreationFabComponent {
  private readonly http = inject(HttpClient);
  readonly candidatesService = inject(CardCandidatesService);
  readonly bulkCreationService = inject(BulkCardCreationService);
  readonly pageService = inject(PageService);
  readonly dialog = inject(MatDialog);
  readonly snackBar = inject(MatSnackBar);

  async startBulkCreation(): Promise<void> {
    const candidates = this.candidatesService.candidates();
    const selectedSource = this.pageService['selectedSource']();
    const page = this.pageService.page.value();
    const cardType = page?.cardType;

    if (!selectedSource || candidates.length === 0 || !cardType) {
      return;
    }

    const selections = this.pageService.getAllExtractionSelections();

    this.bulkCreationService.clearProgress();

    this.dialog.open(BulkCreationProgressDialogComponent, {
      disableClose: true,
      maxWidth: '100vw',
      maxHeight: '100vh',
    });

    const result = await this.bulkCreationService.createCardsInBulk(
      {
        kind: 'extractedItems',
        items: candidates,
        sourceId: selectedSource.sourceId,
        pageNumber: selectedSource.pageNumber,
      },
      cardType
    );

    if (result.succeeded > 0) {
      const regions = selections.map(sel => ({
        pageNumber: sel.pageNumber,
        x: sel.rectangle.x,
        y: sel.rectangle.y,
        width: sel.rectangle.width,
        height: sel.rectangle.height,
      }));

      await fetchJson(this.http, `/api/source/${selectedSource.sourceId}/extraction-regions`, {
        body: { regions },
        method: 'POST',
      });

      this.pageService.reload();
    }
  }
}
