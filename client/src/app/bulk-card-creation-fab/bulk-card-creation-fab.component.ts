import { Component, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { CardCandidatesService } from '../card-candidates.service';
import { BulkCardCreationService } from '../bulk-card-creation.service';
import { BulkCreationProgressDialogComponent } from '../bulk-creation-progress-dialog/bulk-creation-progress-dialog.component';
import { PageService } from '../page.service';
import { DailyUsageService } from '../daily-usage.service';
import { ENVIRONMENT_CONFIG } from '../environment/environment.config';
import { fetchJson } from '../utils/fetchJson';

@Component({
  selector: 'app-bulk-card-creation-fab',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatBadgeModule, MatTooltipModule],
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
  readonly dailyUsageService = inject(DailyUsageService);
  private readonly environmentConfig = inject(ENVIRONMENT_CONFIG);

  readonly totalImagesNeeded = computed(() => {
    const candidates = this.candidatesService.candidates();
    const totalExamples = candidates.reduce(
      (sum, c) => sum + ((c as any).examples?.length ?? 0),
      0
    );
    const imagesPerExample = this.environmentConfig.imageModels
      .filter(m => m.imageCount > 0)
      .reduce((sum, m) => sum + m.imageCount, 0);
    return totalExamples * imagesPerExample;
  });

  readonly isImageLimitExceeded = computed(() => {
    const limit = this.dailyUsageService.imageDailyLimit();
    if (limit === 0) return false;
    return this.dailyUsageService.imageUsageToday() + this.totalImagesNeeded() > limit;
  });

  readonly imageLimitTooltip = computed(() => {
    if (!this.isImageLimitExceeded()) return '';
    const limit = this.dailyUsageService.imageDailyLimit();
    const used = this.dailyUsageService.imageUsageToday();
    const needed = this.totalImagesNeeded();
    return `Daily image limit reached (${used}/${limit} used, ${needed} needed)`;
  });

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
