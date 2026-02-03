import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
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
  RowSelectionModule,
  themeQuartz,
} from 'ag-grid-community';
import { injectParams } from '../utils/inject-params';
import { CardsTableService, CardTableRow } from './cards-table.service';

const RATING_LABELS: Record<number, string> = {
  1: '1 - Again',
  2: '2 - Hard',
  3: '3 - Good',
  4: '4 - Easy',
};

ModuleRegistry.registerModules([
  InfiniteRowModelModule,
  ClientSideRowModelModule,
  ValidationModule,
  TextFilterModule,
  NumberFilterModule,
  DateFilterModule,
  RowSelectionModule,
]);

@Component({
  selector: 'app-cards-table',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
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
  private readonly routeSourceId = injectParams('sourceId');

  readonly sourceId = computed(() => String(this.routeSourceId() ?? ''));

  private gridApi: GridApi | null = null;

  readonly theme = themeQuartz.withParams({ spacing: 6 });

  readonly readinessFilter = signal<string>('');
  readonly stateFilter = signal<string>('');
  readonly lastReviewRatingFilter = signal<string>('');

  readonly selectedCount = signal(0);
  readonly selectedIds = signal<readonly string[]>([]);

  readonly readinessOptions = ['READY', 'IN_REVIEW', 'REVIEWED', 'KNOWN', 'NEW'];
  readonly stateOptions = ['NEW', 'LEARNING', 'REVIEW', 'RELEARNING'];
  readonly ratingOptions = [
    { value: '1', label: '1 - Again' },
    { value: '2', label: '2 - Hard' },
    { value: '3', label: '3 - Good' },
    { value: '4', label: '4 - Easy' },
  ];

  readonly columnDefs: ColDef[] = [
    {
      headerName: '',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 50,
      suppressSizeToFit: true,
      sortable: false,
    },
    {
      headerName: 'Card',
      field: 'label',
      flex: 2,
      sortable: false,
    },
    {
      headerName: 'State',
      field: 'state',
      width: 120,
      sortable: true,
    },
    {
      headerName: 'Reviews',
      field: 'reps',
      width: 100,
      sortable: true,
    },
    {
      headerName: 'Last review',
      field: 'lastReview',
      width: 150,
      sortable: true,
      valueFormatter: (params) => {
        if (!params.value) return '';
        const date = new Date(params.value);
        return date.toLocaleDateString();
      },
    },
    {
      headerName: 'Grade',
      field: 'lastReviewRating',
      width: 110,
      sortable: false,
      valueFormatter: (params) =>
        params.value != null ? (RATING_LABELS[params.value] ?? String(params.value)) : '',
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

  readonly rowSelection = {
    mode: 'multiRow' as const,
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

  onSelectionChanged(): void {
    if (!this.gridApi) return;
    const selected = this.gridApi.getSelectedRows() as CardTableRow[];
    this.selectedCount.set(selected.length);
    this.selectedIds.set(selected.map((r) => r.id));
  }

  onRowClicked(event: RowClickedEvent): void {
    const column = event.api.getFocusedCell()?.column;
    if (column?.getColDef().checkboxSelection) return;

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
