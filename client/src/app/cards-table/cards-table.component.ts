import { Component, computed, effect, inject, linkedSignal, resource, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent } from '../parser/edit-card/confirm-dialog/confirm-dialog.component';
import { BulkCardCreationService } from '../bulk-card-creation.service';
import { BulkCreationProgressDialogComponent } from '../bulk-creation-progress-dialog/bulk-creation-progress-dialog.component';
import { SourcesService } from '../sources.service';
import { AgGridAngular } from 'ag-grid-angular';
import {
  type ColDef,
  type GridReadyEvent,
  type GridApi,
  type IGetRowsParams,
  type GetRowIdParams,
  type RowClickedEvent,
  type SortChangedEvent,
  ModuleRegistry,
  InfiniteRowModelModule,
  ClientSideRowModelModule,
  ValidationModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  ColumnAutoSizeModule,
  RowSelectionModule,
  TooltipModule,
  themeMaterial,
  colorSchemeDarkBlue,
} from 'ag-grid-community';
import { injectParams } from '../utils/inject-params';
import { CardReadiness, CARD_READINESS_VALUES } from '../shared/state/card-readiness';
import { DueCardsService } from '../due-cards.service';
import { InReviewCardsService } from '../in-review-cards.service';
import { CardsTableService, CardTableRow } from './cards-table.service';
import { SelectAllHeaderComponent } from './select-all-header.component';
import { SelectionCheckboxComponent } from './selection-checkbox.component';
import { injectQueryParams } from '../utils/inject-query-params';

type QuickFilter = 'unhealthy' | 'flagged' | 'draft' | 'suggestedKnown';

const STATE_COLORS: Record<string, string> = {
  NEW: '#2196F3',
  LEARNING: '#4CAF50',
  REVIEW: '#FFC107',
  RELEARNING: '#F44336',
};

const READINESS_COLORS: Record<CardReadiness, string> = {
  DRAFT: '#FF9800',
  READY: '#4CAF50',
  IN_REVIEW: '#2196F3',
  REVIEWED: '#00BCD4',
  KNOWN: '#9C27B0'
};

const badgeHtml = (label: string, color: string): string =>
  `<span style="padding:1px 6px;border-radius:4px;font-size:0.7rem;font-weight:500;color:${color};background-color:${color}20;border:1px solid ${color}40">${label}</span>`;

const formatDaysAgo = (days: number): string => {
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  if (days < 60) return '1 month ago';
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  if (days < 730) return '1 year ago';
  return `${Math.floor(days / 365)} years ago`;
};

const VALID_QUICK_FILTERS: readonly QuickFilter[] = ['unhealthy', 'flagged', 'draft', 'suggestedKnown'];

const parseQuickFilter = (value: string | null): QuickFilter | null =>
  VALID_QUICK_FILTERS.includes(value as QuickFilter) ? (value as QuickFilter) : null;

ModuleRegistry.registerModules([
  InfiniteRowModelModule,
  ClientSideRowModelModule,
  ValidationModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  ColumnAutoSizeModule,
  RowSelectionModule,
  TooltipModule,
]);

@Component({
  selector: 'app-cards-table',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    AgGridAngular,
  ],
  templateUrl: './cards-table.component.html',
  styleUrl: './cards-table.component.css',
})
export class CardsTableComponent {
  private readonly router = inject(Router);
  private readonly cardsTableService = inject(CardsTableService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly bulkCreationService = inject(BulkCardCreationService);
  private readonly sourcesService = inject(SourcesService);
  private readonly dueCardsService = inject(DueCardsService);
  private readonly inReviewCardsService = inject(InReviewCardsService);
  private readonly routeSourceId = injectParams<string>('sourceId');
  private readonly filterParam = injectQueryParams<string>('filter');

  readonly sourceId = computed(() => String(this.routeSourceId() ?? ''));
  readonly activeQuickFilter = computed(() => parseQuickFilter(this.filterParam() as string | null));
  readonly isDraftMode = computed(() => this.activeQuickFilter() === 'draft');
  private readonly currentSource = computed(() => {
    const sources = this.sourcesService.sources.value();
    const id = this.sourceId();
    return sources?.find(s => s.id === id);
  });
  readonly sourceCardType = computed(() => this.currentSource()?.cardType);
  readonly unhealthyCount = computed(() => this.currentSource()?.unhealthyCardCount ?? 0);
  readonly flaggedCount = computed(() => this.currentSource()?.flaggedCardCount ?? 0);
  readonly draftCount = computed(() => this.currentSource()?.draftCardCount ?? 0);
  readonly suggestedKnownCount = computed(() => this.currentSource()?.suggestedKnownCardCount ?? 0);
  readonly isCompletingDrafts = this.bulkCreationService.isProcessing;
  private readonly loadedRowReadiness = signal<ReadonlyMap<string, CardReadiness>>(new Map());

  readonly selectionContainsDrafts = computed(() => {
    const ids = this.selectedIds();
    const readinessMap = this.loadedRowReadiness();
    return ids.some(id => readinessMap.get(id) === 'DRAFT');
  });

  readonly readinessFilter = linkedSignal<QuickFilter | null, readonly CardReadiness[]>({
    source: this.activeQuickFilter,
    computation: (quickFilter): readonly CardReadiness[] => {
      if (quickFilter === 'draft') return ['DRAFT'];
      if (quickFilter === 'flagged' || quickFilter === 'unhealthy' || quickFilter === 'suggestedKnown') return [];
      return ['READY', 'IN_REVIEW', 'REVIEWED'];
    },
  });

  constructor() {
    effect(() => {
      this.sourceId();
      if (this.gridApi) {
        this.refreshGrid();
      }
    });
    effect(() => {
      this.activeQuickFilter();
      if (this.gridApi) {
        this.refreshGrid();
      }
    });
  }

  private gridApi: GridApi | null = null;
  private cardFilterTimeout: ReturnType<typeof setTimeout> | null = null;

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

  readonly cardFilter = signal<string>('');
  readonly stateFilter = signal<string>('');
  readonly lastReviewDaysAgoFilter = signal<string>('');
  readonly reviewScoreFilter = signal<string>('');

  private readonly readinessParam = computed(() => {
    const readiness = this.readinessFilter();
    return readiness.length > 0 && readiness.length < this.readinessOptions.length
      ? readiness.join(',')
      : undefined;
  });

  private readonly flaggedParam = computed(() =>
    this.activeQuickFilter() === 'flagged' ? true : undefined
  );

  private readonly unhealthyParam = computed(() =>
    this.activeQuickFilter() === 'unhealthy' ? true : undefined
  );

  private readonly suggestedKnownParam = computed(() =>
    this.activeQuickFilter() === 'suggestedKnown' ? true : undefined
  );

  readonly allFilteredIds = resource({
    params: () => {
      const sourceId = this.sourceId();
      if (!sourceId) return undefined;
      const reviewScoreRange = this.parseReviewScoreRange(this.reviewScoreFilter());
      return {
        sourceId,
        readiness: this.readinessParam(),
        state: this.stateFilter() || undefined,
        lastReviewDaysAgo: this.lastReviewDaysAgoFilter()
          ? Number(this.lastReviewDaysAgoFilter())
          : undefined,
        minReviewScore: reviewScoreRange?.min,
        maxReviewScore: reviewScoreRange?.max,
        cardFilter: this.cardFilter() || undefined,
        flagged: this.flaggedParam(),
        unhealthy: this.unhealthyParam(),
        suggestedKnown: this.suggestedKnownParam(),
      };
    },
    loader: ({ params }) =>
      this.cardsTableService.fetchFilteredCardIds(params),
  });

  readonly selectedIds = linkedSignal<string[] | undefined, readonly string[]>({
    source: this.allFilteredIds.value,
    computation: () => [],
  });

  readonly selectedIdsSet = computed(() => new Set(this.selectedIds()));
  readonly selectedCount = computed(() => this.selectedIds().length);
  readonly totalFilteredCount = computed(
    () => this.allFilteredIds.value()?.length ?? 0
  );

  readonly gridContext = {
    selectedIdsSet: this.selectedIdsSet,
    toggleSelection: (id: string) => this.toggleSelection(id),
    selectedIds: this.selectedIds as { (): readonly string[] },
    totalFilteredCount: this.totalFilteredCount,
    selectAll: () => this.selectAll(),
    deselectAll: () => this.deselectAll(),
  };

  readonly readinessOptions = CARD_READINESS_VALUES;
  readonly stateOptions = ['NEW', 'LEARNING', 'REVIEW', 'RELEARNING'];
  readonly lastReviewDaysAgoOptions = [
    { value: '0', label: 'Today' },
    { value: '3', label: 'Last 3 days' },
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 90 days' },
  ];
  readonly reviewScoreOptions = [
    { value: '0-50', label: '0% - 50%' },
    { value: '51-75', label: '51% - 75%' },
    { value: '76-90', label: '76% - 90%' },
    { value: '91-95', label: '91% - 95%' },
    { value: '96-99', label: '96% - 99%' },
    { value: '100-100', label: '100%' },
  ];

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
      headerName: 'ID',
      field: 'id',
      flex: 2,
      sortable: true,
      cellRenderer: (params: { data: CardTableRow | undefined }) => {
        if (!params.data) return '';
        return `<span style="color:hsl(220,13%,60%);font-size:0.75rem">${params.data.id}</span>`;
      },
    },
    {
      headerName: 'Readiness',
      field: 'readiness',
      width: 120,
      sortable: false,
      cellRenderer: (params: { value: CardReadiness | null }) => {
        if (!params.value) return '';
        return badgeHtml(params.value, READINESS_COLORS[params.value]);
      },
    },
    {
      headerName: 'State',
      field: 'state',
      width: 130,
      sortable: true,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return '';
        return badgeHtml(params.value, STATE_COLORS[params.value] ?? '#666');
      },
    },
    {
      headerName: 'Stability',
      field: 'stability',
      width: 110,
      sortable: true,
      headerTooltip: 'Memory stability in days — how long until the recall probability drops to 90%. Higher means stronger memory.',
      valueFormatter: (params) =>
        params.value != null ? `${Math.round(params.value)}d` : '',
    },
    {
      headerName: 'Reps',
      field: 'reps',
      width: 80,
      sortable: true,
      headerTooltip: 'Total number of successful reviews for this card.',
    },
    {
      headerName: 'Lapses',
      field: 'lapses',
      width: 90,
      sortable: true,
      headerTooltip: 'Number of times this card was forgotten after previously being learned. High lapses indicate a leech card.',
    },
    {
      headerName: 'Streak',
      field: 'correctStreak',
      width: 100,
      sortable: true,
    },
    {
      headerName: 'Last review',
      field: 'lastReviewDaysAgo',
      width: 150,
      sortable: true,
      valueFormatter: (params) =>
        params.value != null ? formatDaysAgo(params.value) : '',
    },
    {
      headerName: 'Score',
      field: 'reviewScore',
      width: 100,
      sortable: true,
      valueFormatter: (params) =>
        params.value != null ? `${params.value}%` : '',
    },
  ];

  readonly defaultColDef: ColDef = {
    resizable: true,
  };

  readonly getRowId = (params: GetRowIdParams) => params.data.id;

  onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;

    event.api.setGridOption('datasource', {
      getRows: (params: IGetRowsParams) => this.loadRows(params),
    });

    event.api.sizeColumnsToFit();
  }

  onSortChanged(_event: SortChangedEvent): void {
    this.refreshGrid();
  }

  onRowClicked(event: RowClickedEvent): void {
    const column = event.api.getFocusedCell()?.column;
    if (column?.getColId() === 'id') return;

    const row = event.data as CardTableRow;
    if (!row || row.readiness === 'DRAFT') return;

    this.router.navigate([
      '/sources',
      this.sourceId(),
      'page',
      row.sourcePageNumber,
      'cards',
      row.id,
    ]);
  }

  onQuickFilterChange(filter: QuickFilter): void {
    const current = this.activeQuickFilter();
    const queryParams = current === filter ? { filter: null } : { filter };
    this.router.navigate([], {
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  onCardFilterChange(value: string): void {
    if (this.cardFilterTimeout) {
      clearTimeout(this.cardFilterTimeout);
    }
    this.cardFilterTimeout = setTimeout(() => {
      this.cardFilter.set(value);
      this.refreshGrid();
    }, 300);
  }

  onReadinessFilterChange(value: CardReadiness[]): void {
    this.readinessFilter.set(value);
    this.refreshGrid();
  }

  onStateFilterChange(value: string): void {
    this.stateFilter.set(value);
    this.refreshGrid();
  }

  onLastReviewDaysAgoFilterChange(value: string): void {
    this.lastReviewDaysAgoFilter.set(value);
    this.refreshGrid();
  }

  onReviewScoreFilterChange(value: string): void {
    this.reviewScoreFilter.set(value);
    this.refreshGrid();
  }

  async markSelectedAsKnown(): Promise<void> {
    const ids = this.selectedIds();
    if (ids.length === 0) return;

    await this.cardsTableService.markCardsAsKnown(ids);
    this.snackBar.open(`${ids.length} card(s) marked as known`, 'Close', {
      duration: 3000,
      verticalPosition: 'top',
    });
    this.selectedIds.set([]);
    await this.cardsTableService.refreshCardView();
    this.refreshGrid();
    this.sourcesService.refetchSources();
    this.dueCardsService.refetchDueCounts();
  }

  async deleteSelected(): Promise<void> {
    const ids = this.selectedIds();
    if (ids.length === 0) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        message: `Are you sure you want to delete ${ids.length} card(s)?`,
      },
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    if (!result) return;

    await this.cardsTableService.deleteCards(ids);
    this.selectedIds.set([]);
    this.snackBar.open(`${ids.length} card(s) deleted`, 'Close', {
      duration: 3000,
      verticalPosition: 'top',
    });
    await this.cardsTableService.refreshCardView();
    this.refreshGrid();
    this.sourcesService.refetchSources();
    this.dueCardsService.refetchDueCounts();
    this.inReviewCardsService.refetchCards();
  }

  async deleteSelectedAudio(): Promise<void> {
    const ids = this.selectedIds();
    if (ids.length === 0) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '300px',
      data: {
        message: `Are you sure you want to delete audio for ${ids.length} card(s)?`,
      },
    });

    const result = await firstValueFrom(dialogRef.afterClosed());
    if (!result) return;

    await this.cardsTableService.deleteCardsAudio(ids);
    this.selectedIds.set([]);
    this.snackBar.open(`Audio deleted for ${ids.length} card(s)`, 'Close', {
      duration: 3000,
      verticalPosition: 'top',
    });
    await this.cardsTableService.refreshCardView();
    this.refreshGrid();
  }

  async completeDraftCards(): Promise<void> {
    const ids = this.selectedIds();
    const cardType = this.sourceCardType();
    if (ids.length === 0 || !cardType) return;

    this.bulkCreationService.clearProgress();

    this.dialog.open(BulkCreationProgressDialogComponent, {
      disableClose: true,
      maxWidth: '100vw',
      maxHeight: '100vh',
    });

    const result = await this.bulkCreationService.createCardsInBulk(
      { kind: 'draftCardIds', cardIds: [...ids] },
      cardType
    );

    this.selectedIds.set([]);

    if (result.succeeded > 0) {
      this.snackBar.open(`${result.succeeded} card(s) completed`, 'Close', {
        duration: 3000,
        verticalPosition: 'top',
      });
    }

    await this.cardsTableService.refreshCardView();
    this.refreshGrid();
    this.sourcesService.refetchSources();
    this.inReviewCardsService.refetchCards();
  }

  private toggleSelection(id: string): void {
    const current = this.selectedIds();
    const currentSet = this.selectedIdsSet();
    this.selectedIds.set(
      currentSet.has(id)
        ? current.filter((cid) => cid !== id)
        : [...current, id]
    );
  }

  private selectAll(): void {
    const ids = this.allFilteredIds.value();
    if (!ids) return;
    this.selectedIds.set(ids);
  }

  private deselectAll(): void {
    this.selectedIds.set([]);
  }

  private refreshGrid(): void {
    this.gridApi?.setGridOption('datasource', {
      getRows: (params: IGetRowsParams) => this.loadRows(params),
    });
  }

  private parseReviewScoreRange(value: string): { min: number; max: number } | undefined {
    if (!value) return undefined;
    const [min, max] = value.split('-').map(Number);
    return { min, max };
  }

  private async loadRows(params: IGetRowsParams): Promise<void> {
    const sortModel = params.sortModel;
    const sortField = sortModel.length > 0 ? sortModel[0].colId : undefined;
    const sortDirection = sortModel.length > 0 ? sortModel[0].sort : undefined;
    const reviewScoreRange = this.parseReviewScoreRange(this.reviewScoreFilter());

    try {
      const response = await this.cardsTableService.fetchCards({
        sourceId: this.sourceId(),
        startRow: params.startRow,
        endRow: params.endRow,
        sortField,
        sortDirection,
        readiness: this.readinessParam(),
        state: this.stateFilter() || undefined,
        lastReviewDaysAgo: this.lastReviewDaysAgoFilter()
          ? Number(this.lastReviewDaysAgoFilter())
          : undefined,
        minReviewScore: reviewScoreRange?.min,
        maxReviewScore: reviewScoreRange?.max,
        cardFilter: this.cardFilter() || undefined,
        flagged: this.flaggedParam(),
        unhealthy: this.unhealthyParam(),
        suggestedKnown: this.suggestedKnownParam(),
      });

      const updatedMap = new Map(this.loadedRowReadiness());
      response.rows.forEach(row => updatedMap.set(row.id, row.readiness));
      this.loadedRowReadiness.set(updatedMap);

      params.successCallback(response.rows, response.totalCount);
    } catch {
      params.failCallback();
    }
  }
}
