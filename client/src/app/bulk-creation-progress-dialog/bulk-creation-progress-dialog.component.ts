import { Component, inject, signal } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { BulkCardCreationService } from '../bulk-card-creation.service';
import { HighlightsService } from '../highlights.service';
import { RouterLink } from '@angular/router';
import { DotReporterComponent } from '../shared/dot-reporter/dot-reporter.component';

export type BulkCreationDialogData = {
  sourceId: string;
} | undefined;

@Component({
  selector: 'app-bulk-creation-progress-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    RouterLink,
    DotReporterComponent,
  ],
  templateUrl: './bulk-creation-progress-dialog.component.html',
  styleUrl: './bulk-creation-progress-dialog.component.css',
})
export class BulkCreationProgressDialogComponent {
  readonly bulkCardService = inject(BulkCardCreationService);
  private readonly highlightsService = inject(HighlightsService);
  private readonly dialogRef = inject(MatDialogRef<BulkCreationProgressDialogComponent>);
  private readonly data: BulkCreationDialogData = inject(MAT_DIALOG_DATA, { optional: true });
  readonly cleanedUp = signal<number | null>(null);
  readonly cleaning = signal(false);

  get showCleanup(): boolean {
    return this.data?.sourceId !== undefined;
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  async cleanupHighlights(): Promise<void> {
    const sourceId = this.data?.sourceId;
    if (!sourceId) return;
    this.cleaning.set(true);
    const { deleted } = await this.highlightsService.cleanupWithCards(sourceId);
    this.cleaning.set(false);
    this.cleanedUp.set(deleted);
  }
}
