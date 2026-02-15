import { Component, computed, inject, linkedSignal, resource, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent } from '../parser/edit-card/confirm-dialog/confirm-dialog.component';
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
  themeMaterial,
  colorSchemeDarkBlue,
} from 'ag-grid-community';
import { injectParams } from '../utils/inject-params';
import { CardsTableService, CardTableRow } from './cards-table.service';
import { SelectAllHeaderComponent } from './select-all-header.component';
import { SelectionCheckboxComponent } from './selection-checkbox.component';

const RATING_LABELS: Record<number, string> = {
  1: '1 - Again',
  2: '2 - Hard',
  3: '3 - Good',
  4: '4 - Easy',
};

const RATING_COLORS: Record<number, string> = {
  1: '#dc3545',
  2: '#fd7e14',
  3: '#28a745',
  4: '#0d6efd',
};

const STATE_COLORS: Record<string, string> = {
  NEW: '#2196F3',
  LEARNING: '#4CAF50',
  REVIEW: '#FFC107',
  RELEARNING: '#F44336',
};

const READINESS_COLORS: Record<string, string> = {
  READY: '#4CAF50',
  IN_REVIEW: '#2196F3',
  REVIEWED: '#00BCD4',
  KNOWN: '#9C27B0',
  NEW: '#78909C',
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

ModuleRegistry.registerModules([
  InfiniteRowModelModule,
  ClientSideRowModelModule,
  ValidationModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  ColumnAutoSizeModule,
]);

@Component({
  selector: 'app-cards-table',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
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
  private readonly routeSourceId = injectParams('sourceId');

  readonly sourceId = computed(() => String(this.routeSourceId() ?? ''));

  private gridApi: GridApi | null = null;

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

  readonly readinessFilter = signal<string>('');
  readonly stateFilter = signal<string>('');
  readonly lastReviewRatingFilter = signal<string>('');
  readonly lastReviewDaysAgoFilter = signal<string>('');

  readonly allFilteredIds = resource({
    params: () => {
      const sourceId = this.sourceId();
      if (!sourceId) return undefined;
      return {
        sourceId,
        readiness: this.readinessFilter() || undefined,
        state: this.stateFilter() || undefined,
        lastReviewDaysAgo: this.lastReviewDaysAgoFilter()
          ? Number(this.lastReviewDaysAgoFilter())
          : undefined,
        lastReviewRating: this.lastReviewRatingFilter()
          ? Number(this.lastReviewRatingFilter())
          : undefined,
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

  readonly readinessOptions = ['READY', 'IN_REVIEW', 'REVIEWED', 'KNOWN', 'NEW'];
  readonly stateOptions = ['NEW', 'LEARNING', 'REVIEW', 'RELEARNING'];
  readonly ratingOptions = [
    { value: '1', label: '1 - Again' },
    { value: '2', label: '2 - Hard' },
    { value: '3', label: '3 - Good' },
    { value: '4', label: '4 - Easy' },
  ];
  readonly lastReviewDaysAgoOptions = [
    { value: '0', label: 'Today' },
    { value: '3', label: 'Last 3 days' },
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 90 days' },
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
      headerName: 'Card',
      field: 'label',
      flex: 2,
      sortable: false,
    },
    {
      headerName: 'Readiness',
      field: 'readiness',
      width: 120,
      sortable: false,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return '';
        return badgeHtml(params.value, READINESS_COLORS[params.value] ?? '#666');
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
      headerName: 'Reviews',
      field: 'reps',
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
      headerName: 'Grade',
      field: 'lastReviewRating',
      width: 110,
      sortable: false,
      cellRenderer: (params: { value: number | null }) => {
        if (params.value == null) return '';
        const label = RATING_LABELS[params.value] ?? String(params.value);
        return badgeHtml(label, RATING_COLORS[params.value] ?? '#666');
      },
    },
    {
      headerName: 'Person',
      field: 'lastReviewPerson',
      width: 120,
      sortable: false,
      valueFormatter: (params) => params.value ?? 'Me',
    },
  ];

  readonly defaultColDef: ColDef = {
    resizable: true,
  };

  readonly getRowId = (params: GetRowIdParams) => params.data.id;

  async onGridReady(event: GridReadyEvent): Promise<void> {
    this.gridApi = event.api;

    await this.cardsTableService.refreshCardView();

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
    if (!row) return;

    this.router.navigate([
      '/sources',
      this.sourceId(),
      'page',
      row.sourcePageNumber,
      'cards',
      row.id,
    ]);
  }

  onReadinessFilterChange(value: string): void {
    this.readinessFilter.set(value);
    this.refreshGrid();
  }

  onStateFilterChange(value: string): void {
    this.stateFilter.set(value);
    this.refreshGrid();
  }

  onRatingFilterChange(value: string): void {
    this.lastReviewRatingFilter.set(value);
    this.refreshGrid();
  }

  onLastReviewDaysAgoFilterChange(value: string): void {
    this.lastReviewDaysAgoFilter.set(value);
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
    this.refreshGrid();
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
    this.refreshGrid();
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
    this.refreshGrid();
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

  private async loadRows(params: IGetRowsParams): Promise<void> {
    const sortModel = params.sortModel;
    const sortField = sortModel.length > 0 ? sortModel[0].colId : undefined;
    const sortDirection = sortModel.length > 0 ? sortModel[0].sort : undefined;

    try {
      const response = await this.cardsTableService.fetchCards({
        sourceId: this.sourceId(),
        startRow: params.startRow,
        endRow: params.endRow,
        sortField,
        sortDirection,
        readiness: this.readinessFilter() || undefined,
        state: this.stateFilter() || undefined,
        lastReviewDaysAgo: this.lastReviewDaysAgoFilter()
          ? Number(this.lastReviewDaysAgoFilter())
          : undefined,
        lastReviewRating: this.lastReviewRatingFilter()
          ? Number(this.lastReviewRatingFilter())
          : undefined,
      });

      params.successCallback(response.rows, response.totalCount);
    } catch {
      params.failCallback();
    }
  }
}
