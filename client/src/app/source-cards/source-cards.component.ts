import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AgGridAngular } from 'ag-grid-angular';
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type GetRowIdParams,
  type GridApi,
  type GridReadyEvent,
  type IDatasource,
  type IGetRowsParams,
  type RowClickedEvent,
  type SortModelItem,
  themeQuartz,
} from 'ag-grid-community';
import { SourceCardsService, type CardTableRow } from './source-cards.service';

ModuleRegistry.registerModules([AllCommunityModule]);

const GRADE_LABELS: Record<number, string> = {
  1: 'Again',
  2: 'Hard',
  3: 'Good',
  4: 'Easy',
};

const REVIEW_COUNT_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Never reviewed', value: '0-0' },
  { label: '1-5', value: '1-5' },
  { label: '6-10', value: '6-10' },
  { label: '11+', value: '11-' },
];

const REVIEW_DATE_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: 'last7days' },
  { label: 'Last 30 days', value: 'last30days' },
  { label: 'Over 30 days ago', value: 'over30days' },
  { label: 'Never', value: 'never' },
];

@Component({
  selector: 'app-source-cards',
  standalone: true,
  imports: [
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    AgGridAngular,
  ],
  templateUrl: './source-cards.component.html',
  styleUrl: './source-cards.component.css',
})
export class SourceCardsComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sourceCardsService = inject(SourceCardsService);

  readonly sourceId = signal('');
  readonly sourceName = signal('');
  readonly selectedCount = signal(0);

  readonly stateFilter = signal('');
  readonly gradeFilter = signal<string>('');
  readonly reviewCountFilter = signal('');
  readonly reviewDateFilter = signal('');

  readonly stateOptions = ['', 'NEW', 'LEARNING', 'REVIEW', 'RELEARNING', 'KNOWN'];
  readonly gradeOptions = ['', '1', '2', '3', '4'];
  readonly reviewCountOptions = REVIEW_COUNT_OPTIONS;
  readonly reviewDateOptions = REVIEW_DATE_OPTIONS;

  readonly theme = themeQuartz.withParams({
    backgroundColor: 'var(--mat-sys-surface)',
    foregroundColor: 'var(--mat-sys-on-surface)',
    headerBackgroundColor: 'var(--mat-sys-surface-container)',
    borderColor: 'var(--mat-sys-outline-variant)',
    rowHoverColor: 'var(--mat-sys-surface-container-highest)',
    selectedRowBackgroundColor: 'var(--mat-sys-secondary-container)',
  });

  readonly hasSelection = computed(() => this.selectedCount() > 0);

  private gridApi: GridApi | null = null;
  private routeSubscription: any;

  readonly columnDefs: ColDef<CardTableRow>[] = [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      width: 50,
      sortable: false,
      suppressHeaderMenuButton: true,
    },
    {
      headerName: 'Card',
      field: 'label',
      sortable: true,
      flex: 2,
    },
    {
      headerName: 'State',
      field: 'state',
      sortable: true,
      width: 120,
      cellRenderer: (params: { value: string }) => {
        if (!params.value) return '';
        const colors: Record<string, string> = {
          NEW: '#2196F3',
          LEARNING: '#4CAF50',
          REVIEW: '#FFC107',
          RELEARNING: '#F44336',
          KNOWN: '#9E9E9E',
        };
        const names: Record<string, string> = {
          NEW: 'New',
          LEARNING: 'Learning',
          REVIEW: 'Review',
          RELEARNING: 'Relearning',
          KNOWN: 'Known',
        };
        const bg = colors[params.value] ?? '#000';
        const name = names[params.value] ?? params.value;
        return `<span style="background:${bg};color:white;padding:2px 8px;border-radius:12px;font-size:0.75rem;">${name}</span>`;
      },
    },
    {
      headerName: 'Reviews',
      field: 'reviewCount',
      sortable: true,
      width: 100,
    },
    {
      headerName: 'Last Review',
      field: 'lastReviewDate',
      sortable: true,
      width: 150,
      cellRenderer: (params: { value: string | null }) => {
        if (!params.value) return '';
        const date = new Date(params.value);
        return date.toLocaleDateString();
      },
    },
    {
      headerName: 'Grade',
      field: 'lastReviewGrade',
      sortable: true,
      width: 100,
      cellRenderer: (params: { value: number | null }) => {
        if (params.value == null) return '';
        return GRADE_LABELS[params.value] ?? String(params.value);
      },
    },
    {
      headerName: 'Reviewer',
      field: 'lastReviewPerson',
      sortable: true,
      width: 120,
      cellRenderer: (params: { value: string | null }) =>
        params.value ?? 'Me',
    },
  ];

  readonly defaultColDef: ColDef = {
    resizable: true,
  };

  getRowId = (params: GetRowIdParams<CardTableRow>) => params.data.id;

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      this.sourceId.set(params.get('sourceId') ?? '');
    });
    this.route.data.subscribe((data) => {
      this.sourceName.set(data['sourceName'] ?? '');
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;
    this.gridApi.setGridOption('datasource', this.createDatasource());
  }

  onSelectionChanged(): void {
    const selected = this.gridApi?.getSelectedRows() ?? [];
    this.selectedCount.set(selected.length);
  }

  onRowClicked(event: RowClickedEvent<CardTableRow>): void {
    const target = event.event?.target as HTMLElement;
    if (target?.closest('.ag-checkbox-input-wrapper')) return;

    const row = event.data;
    if (row) {
      this.router.navigate([
        '/sources', this.sourceId(), 'page', row.sourcePageNumber, 'cards', row.id,
      ]);
    }
  }

  onFilterChange(): void {
    this.gridApi?.setGridOption('datasource', this.createDatasource());
  }

  getStateLabel(value: string): string {
    const labels: Record<string, string> = {
      '': 'All',
      NEW: 'New',
      LEARNING: 'Learning',
      REVIEW: 'Review',
      RELEARNING: 'Relearning',
      KNOWN: 'Known',
    };
    return labels[value] ?? value;
  }

  getGradeLabel(value: string): string {
    if (!value) return 'All';
    return GRADE_LABELS[Number(value)] ?? value;
  }

  async markAsKnown(): Promise<void> {
    const selected: CardTableRow[] = this.gridApi?.getSelectedRows() ?? [];
    const cardIds = selected.map((row) => row.id);
    if (cardIds.length === 0) return;

    await this.sourceCardsService.updateCardsReadiness(cardIds, 'KNOWN');
    this.gridApi?.deselectAll();
    this.gridApi?.setGridOption('datasource', this.createDatasource());
  }

  async markAsReady(): Promise<void> {
    const selected: CardTableRow[] = this.gridApi?.getSelectedRows() ?? [];
    const cardIds = selected.map((row) => row.id);
    if (cardIds.length === 0) return;

    await this.sourceCardsService.updateCardsReadiness(cardIds, 'READY');
    this.gridApi?.deselectAll();
    this.gridApi?.setGridOption('datasource', this.createDatasource());
  }

  private createDatasource(): IDatasource {
    const sourceId = this.sourceId();
    const stateFilter = this.stateFilter();
    const gradeFilter = this.gradeFilter();
    const reviewCountFilter = this.reviewCountFilter();
    const reviewDateFilter = this.reviewDateFilter();

    return {
      getRows: (params: IGetRowsParams) => {
        const sortModel: SortModelItem[] = params.sortModel;
        const sortField = sortModel.length > 0 ? sortModel[0].colId : undefined;
        const sortDir = sortModel.length > 0 ? sortModel[0].sort : undefined;

        const reviewRange = this.parseReviewCountRange(reviewCountFilter);

        this.sourceCardsService
          .fetchCards({
            sourceId,
            startRow: params.startRow,
            endRow: params.endRow,
            sortField,
            sortDir,
            state: stateFilter || undefined,
            lastReviewGrade: gradeFilter ? Number(gradeFilter) : undefined,
            minReviews: reviewRange.min,
            maxReviews: reviewRange.max,
            lastReviewDate: reviewDateFilter || undefined,
          })
          .then((response) => {
            params.successCallback(response.rows, response.totalCount);
          })
          .catch(() => {
            params.failCallback();
          });
      },
    };
  }

  private parseReviewCountRange(value: string): { min?: number; max?: number } {
    if (!value) return {};
    const parts = value.split('-');
    return {
      min: parts[0] ? Number(parts[0]) : undefined,
      max: parts[1] ? Number(parts[1]) : undefined,
    };
  }
}
