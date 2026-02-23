import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HighlightsService } from '../highlights.service';
import { BulkCardCreationService } from '../bulk-card-creation.service';
import { BulkCreationProgressDialogComponent } from '../bulk-creation-progress-dialog/bulk-creation-progress-dialog.component';
import { MultiModelService } from '../multi-model.service';
import { Highlight, ExtractedItem, Word } from '../parser/types';
import { injectParams } from '../utils/inject-params';
import { fetchJson } from '../utils/fetchJson';

interface NormalizeWordResponse {
  normalizedWord: string;
  forms: string[];
}

interface WordIdResponse {
  id: string;
  exists: boolean;
  warning: boolean;
}

interface TranslationResponse {
  translation: string;
  examples: string[];
}

@Component({
  selector: 'app-highlights',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatListModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './highlights.component.html',
  styleUrl: './highlights.component.css',
})
export class HighlightsComponent {
  private readonly highlightsService = inject(HighlightsService);
  private readonly bulkCreationService = inject(BulkCardCreationService);
  private readonly multiModelService = inject(MultiModelService);
  private readonly http = inject(HttpClient);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly routeSourceId = injectParams('sourceId');

  readonly highlights = this.highlightsService.highlights.value;
  readonly loading = this.highlightsService.highlights.isLoading;
  readonly selectedIds = signal<Set<number>>(new Set());
  readonly resolving = signal(false);
  readonly isCreating = this.bulkCreationService.isCreating;

  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly allSelected = computed(() => {
    const highlights = this.highlights();
    return highlights !== undefined && highlights.length > 0 && this.selectedIds().size === highlights.length;
  });
  readonly someSelected = computed(() => {
    const count = this.selectedIds().size;
    const highlights = this.highlights();
    return count > 0 && highlights !== undefined && count < highlights.length;
  });

  constructor() {
    effect(() => {
      const sourceId = this.routeSourceId();
      if (sourceId) {
        this.highlightsService.setSourceId(String(sourceId));
      }
    });
  }

  isSelected(highlight: Highlight): boolean {
    return this.selectedIds().has(highlight.id);
  }

  toggleSelection(highlight: Highlight) {
    this.selectedIds.update(ids => {
      const next = new Set(ids);
      if (next.has(highlight.id)) {
        next.delete(highlight.id);
      } else {
        next.add(highlight.id);
      }
      return next;
    });
  }

  toggleAll() {
    const highlights = this.highlights();
    if (!highlights) return;

    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(highlights.map(h => h.id)));
    }
  }

  async startBulkCreation(): Promise<void> {
    const highlights = this.highlights();
    const sourceId = this.routeSourceId();
    if (!highlights || !sourceId) return;

    const selectedHighlights = highlights.filter(h => this.selectedIds().has(h.id));
    if (selectedHighlights.length === 0) return;

    this.resolving.set(true);

    const resolvedItems = await this.resolveHighlightsToItems(selectedHighlights);
    const items = resolvedItems.filter(item => !item.exists);

    this.resolving.set(false);

    if (items.length === 0) {
      this.snackBar.open('All selected highlights already have cards', 'OK', { duration: 3000 });
      return;
    }

    this.bulkCreationService.clearProgress();
    this.dialog.open(BulkCreationProgressDialogComponent, {
      disableClose: true,
      maxWidth: '100vw',
      maxHeight: '100vh',
    });

    const result = await this.bulkCreationService.createCardsInBulk(
      items,
      String(sourceId),
      1,
      'vocabulary'
    );

    if (result.succeeded > 0) {
      this.selectedIds.set(new Set());
      this.highlightsService.reload();
    }
  }

  private async resolveHighlightsToItems(highlights: Highlight[]): Promise<ExtractedItem[]> {
    const results = await Promise.all(
      highlights.map(async (highlight): Promise<Word | null> => {
        try {
          const normalizeResponse = await this.multiModelService.call<NormalizeWordResponse>(
            'classification',
            (model: string, headers?: Record<string, string>) =>
              fetchJson<NormalizeWordResponse>(
                this.http,
                `/api/normalize-word?model=${model}`,
                {
                  body: {
                    word: highlight.highlightedWord,
                    sentence: highlight.sentence,
                  },
                  method: 'POST',
                  headers,
                }
              )
          );

          const normalizedWord = normalizeResponse.normalizedWord;

          const translationResponse = await this.multiModelService.call<TranslationResponse>(
            'translation',
            (model: string, headers?: Record<string, string>) =>
              fetchJson<TranslationResponse>(
                this.http,
                `/api/translate/hu?model=${model}`,
                {
                  body: {
                    word: normalizedWord,
                    forms: normalizeResponse.forms,
                    examples: [highlight.sentence],
                  },
                  method: 'POST',
                  headers,
                }
              )
          );

          const wordIdResponse = await fetchJson<WordIdResponse>(
            this.http,
            '/api/word-id',
            {
              body: {
                germanWord: normalizedWord,
                hungarianTranslation: translationResponse.translation,
              },
              method: 'POST',
            }
          );

          return {
            id: wordIdResponse.id,
            exists: wordIdResponse.exists,
            warning: wordIdResponse.warning,
            word: normalizedWord,
            forms: normalizeResponse.forms,
            examples: [highlight.sentence],
          };
        } catch {
          return null;
        }
      })
    );

    return results.filter((item): item is Word => item !== null);
  }
}
