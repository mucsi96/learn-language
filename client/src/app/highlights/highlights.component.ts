import { Component, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AgGridAngular } from 'ag-grid-angular';
import {
  type ColDef,
  type GridReadyEvent,
  type GridApi,
  type GetRowIdParams,
  ModuleRegistry,
  ClientSideRowModelModule,
  ValidationModule,
  ColumnAutoSizeModule,
  themeMaterial,
  colorSchemeDarkBlue,
} from 'ag-grid-community';
import { HighlightsService } from '../highlights.service';
import { BulkCardCreationService } from '../bulk-card-creation.service';
import { BulkCreationProgressDialogComponent } from '../bulk-creation-progress-dialog/bulk-creation-progress-dialog.component';
import { MultiModelService } from '../multi-model.service';
import { Highlight, ExtractedItem, Word } from '../parser/types';
import { injectParams } from '../utils/inject-params';
import { fetchJson } from '../utils/fetchJson';
import { SelectAllHeaderComponent } from '../cards-table/select-all-header.component';
import { SelectionCheckboxComponent } from '../cards-table/selection-checkbox.component';

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

const CARD_STATUS_COLORS: Record<string, string> = {
  EXISTS: '#4CAF50',
  NEW: '#2196F3',
};

const badgeHtml = (label: string, color: string): string =>
  `<span style="padding:1px 6px;border-radius:4px;font-size:0.7rem;font-weight:500;color:${color};background-color:${color}20;border:1px solid ${color}40">${label}</span>`;

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  ValidationModule,
  ColumnAutoSizeModule,
]);

@Component({
  selector: 'app-highlights',
  imports: [
    MatButtonModule,
    MatIconModule,
    AgGridAngular,
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

  private gridApi: GridApi | null = null;

  readonly highlights = this.highlightsService.highlights.value;
  readonly loading = this.highlightsService.highlights.isLoading;
  readonly resolving = signal(false);
  readonly isCreating = this.bulkCreationService.isCreating;

  readonly allHighlightIds = computed(() =>
    (this.highlights() ?? []).map(h => String(h.id))
  );

  readonly selectedIds = linkedSignal<Highlight[] | undefined, readonly string[]>({
    source: this.highlights,
    computation: () => [],
  });

  readonly selectedIdsSet = computed(() => new Set(this.selectedIds()));
  readonly selectedCount = computed(() => this.selectedIds().length);
  readonly totalFilteredCount = computed(() => this.allHighlightIds().length);

  readonly gridContext = {
    selectedIdsSet: this.selectedIdsSet,
    toggleSelection: (id: string) => this.toggleSelection(id),
    selectedIds: this.selectedIds as { (): readonly string[] },
    totalFilteredCount: this.totalFilteredCount,
    selectAll: () => this.selectAll(),
    deselectAll: () => this.deselectAll(),
  };

  readonly theme = themeMaterial.withPart(colorSchemeDarkBlue).withParams({
    backgroundColor: 'hsl(215, 28%, 17%)',
    foregroundColor: 'hsl(220, 13%, 91%)',
    headerBackgroundColor: 'hsl(217, 19%, 27%)',
    headerTextColor: 'hsl(220, 13%, 91%)',
    headerFontWeight: 500,
    rowHoverColor: 'hsl(217, 19%, 22%)',
    accentColor: 'hsl(220, 89%, 53%)',
    selectedRowBackgroundColor: 'hsl(220, 89%, 53%, 0.15)',
    fontFamily: 'system-ui',
  });

  readonly columnDefs: ColDef[] = [
    {
      headerName: '',
      field: 'id',
      width: 56,
      sortable: false,
      resizable: false,
      cellRenderer: SelectionCheckboxComponent,
      headerComponent: SelectAllHeaderComponent,
    },
    {
      headerName: 'Card ID',
      field: 'candidateCardId',
      flex: 1,
      sortable: true,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return '<span style="color:hsl(220,13%,40%);font-size:0.75rem">-</span>';
        return `<span style="color:hsl(220,13%,60%);font-size:0.75rem">${params.value}</span>`;
      },
    },
    {
      headerName: 'Status',
      field: 'cardExists',
      width: 100,
      sortable: true,
      cellRenderer: (params: { data: Highlight | undefined }) => {
        if (!params.data?.candidateCardId) return '';
        const exists = params.data.cardExists;
        return badgeHtml(
          exists ? 'EXISTS' : 'NEW',
          exists ? CARD_STATUS_COLORS['EXISTS'] : CARD_STATUS_COLORS['NEW']
        );
      },
    },
    {
      headerName: 'Word',
      field: 'highlightedWord',
      flex: 1,
      sortable: true,
    },
    {
      headerName: 'Sentence',
      field: 'sentence',
      flex: 3,
      sortable: true,
    },
  ];

  readonly defaultColDef: ColDef = {
    resizable: true,
  };

  readonly getRowId = (params: GetRowIdParams) => String(params.data.id);

  constructor() {
    effect(() => {
      const sourceId = this.routeSourceId();
      if (typeof sourceId === 'string') {
        this.highlightsService.setSourceId(sourceId);
      }
    });

    effect(() => {
      const highlights = this.highlights();
      if (highlights && this.gridApi) {
        this.gridApi.setGridOption('rowData', highlights);
        this.gridApi.sizeColumnsToFit();
      }
    });
  }

  onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;
    const highlights = this.highlights();
    if (highlights) {
      event.api.setGridOption('rowData', highlights);
    }
    event.api.sizeColumnsToFit();
  }

  async startBulkCreation(): Promise<void> {
    const highlights = this.highlights();
    const sourceId = this.routeSourceId();
    if (!highlights || typeof sourceId !== 'string') return;

    const selectedSet = this.selectedIdsSet();
    const selectedHighlights = highlights.filter(h => selectedSet.has(String(h.id)));
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
      sourceId,
      1,
      'vocabulary'
    );

    if (result.succeeded > 0) {
      this.selectedIds.set([]);
      this.highlightsService.reload();
    }
  }

  private toggleSelection(id: string): void {
    const current = this.selectedIds();
    const currentSet = this.selectedIdsSet();
    this.selectedIds.set(
      currentSet.has(id)
        ? current.filter(cid => cid !== id)
        : [...current, id]
    );
  }

  private selectAll(): void {
    this.selectedIds.set(this.allHighlightIds());
  }

  private deselectAll(): void {
    this.selectedIds.set([]);
  }

  private async resolveHighlightsToItems(highlights: Highlight[]): Promise<ExtractedItem[]> {
    const results = await Promise.allSettled(
      highlights.map(async (highlight): Promise<Word> => {
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
      })
    );

    const failed = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected'
    );

    if (failed.length > 0) {
      this.snackBar.open(
        `Failed to resolve ${failed.length} highlight(s)`,
        'OK',
        { duration: 5000 }
      );
    }

    return results
      .filter((r): r is PromiseFulfilledResult<Word> => r.status === 'fulfilled')
      .map(r => r.value);
  }
}
