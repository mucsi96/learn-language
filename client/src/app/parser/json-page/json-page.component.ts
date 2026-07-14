import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { injectParams } from '../../utils/inject-params';
import { dialogResult } from '../../utils/dialog-result';
import { SourcesService } from '../../sources.service';
import { JsonSourceService } from '../../json-source.service';
import {
  SimpleCardImportDialogComponent,
  SimpleCardImportDialogResult,
} from '../../simple-card-import-dialog/simple-card-import-dialog.component';

@Component({
  selector: 'app-json-page',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './json-page.component.html',
  styleUrl: './json-page.component.css',
})
export class JsonPageComponent {
  private readonly routeSourceId = injectParams('sourceId');
  private readonly sourcesService = inject(SourcesService);
  private readonly jsonSourceService = inject(JsonSourceService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly sourceId = computed(() => {
    const id = this.routeSourceId();
    return id ? String(id) : null;
  });

  readonly source = computed(() =>
    (this.sourcesService.sources.value() ?? []).find(
      (s) => s.id === this.sourceId()
    )
  );

  readonly importing = signal(false);

  async importJson(): Promise<void> {
    const sourceId = this.sourceId();
    if (!sourceId) {
      return;
    }
    const ref = this.dialog.open<
      SimpleCardImportDialogComponent,
      void,
      SimpleCardImportDialogResult
    >(SimpleCardImportDialogComponent, { width: '640px' });
    const result = await dialogResult(ref);
    if (!result || result.cards.length === 0) {
      return;
    }
    this.importing.set(true);
    try {
      const failed = await this.jsonSourceService.createCards(
        sourceId,
        result.cards,
        'DRAFT'
      );
      const message =
        failed.length > 0
          ? `Failed to import ${failed.length} of ${result.cards.length} cards`
          : `Imported ${result.cards.length} cards as drafts`;
      this.snackBar.open(message, 'Dismiss', { duration: 5000 });
    } finally {
      this.importing.set(false);
      this.sourcesService.refetchSources();
    }
  }
}
