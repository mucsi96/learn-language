import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
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
  ColumnAutoSizeModule,
  themeMaterial,
  colorSchemeDarkBlue,
} from 'ag-grid-community';
import { ModelUsageLogsService, ModelUsageLog, ModelType, OperationGroup, DiffLine, OperationTypeSummaryGroup } from './model-usage-logs.service';
import { ExpandCellRendererComponent } from './cell-renderers/expand-cell-renderer.component';
import { ModelTypeCellRendererComponent } from './cell-renderers/model-type-cell-renderer.component';
import { ModelNameCellRendererComponent } from './cell-renderers/model-name-cell-renderer.component';
import { DiffCellRendererComponent } from './cell-renderers/diff-cell-renderer.component';
import { PerDollarCellRendererComponent } from './cell-renderers/per-dollar-cell-renderer.component';
import { RatingCellRendererComponent } from './cell-renderers/rating-cell-renderer.component';

const getUsageDisplay = (log: ModelUsageLog): string => {
  if (log.modelType === 'CHAT') {
    return `${log.inputTokens ?? 0} / ${log.outputTokens ?? 0} tokens`;
  } else if (log.modelType === 'IMAGE') {
    return `${log.imageCount ?? 0} image(s)`;
  } else if (log.modelType === 'AUDIO') {
    return `${log.inputCharacters ?? 0} chars`;
  }
  return '-';
};

const getDurationSeconds = (log: ModelUsageLog): number => {
  return log.processingTimeMs / 1000;
};

ModuleRegistry.registerModules([
  InfiniteRowModelModule,
  ClientSideRowModelModule,
  ValidationModule,
  ColumnAutoSizeModule,
]);

@Component({
  selector: 'app-model-usage-logs',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatTableModule,
    AgGridAngular,
    DecimalPipe,
  ],
  templateUrl: './model-usage-logs.component.html',
  styleUrl: './model-usage-logs.component.css',
})
export class ModelUsageLogsComponent {
  private readonly service = inject(ModelUsageLogsService);

  readonly summary = this.service.summary.value;
  readonly groupedSummary = this.service.groupedSummary;
  readonly expandedLogId = signal<number | null>(null);
  readonly ratingStars = [1, 2, 3, 4, 5];
  readonly totalCount = signal(0);

  readonly availableDates = this.service.availableDates;
  readonly availableModelTypes = this.service.availableModelTypes;
  readonly availableOperationTypes = this.service.availableOperationTypes;

  readonly dateFilter = this.service.dateFilter;
  readonly modelTypeFilter = this.service.modelTypeFilter;
  readonly operationTypeFilter = this.service.operationTypeFilter;
  readonly modelNameFilter = this.service.modelNameFilter;

  readonly canDelete = computed(() => this.dateFilter() !== 'ALL');

  readonly summaryColumns: string[] = [
    'modelName',
    'totalCalls',
    'ratedCalls',
    'averageRating',
    'totalCost',
  ];

  private gridApi: GridApi | null = null;
  private currentPageLogs: ModelUsageLog[] = [];
  private currentGroups: OperationGroup[] = [];

  readonly theme = themeMaterial.withPart(colorSchemeDarkBlue).withParams({
    backgroundColor: 'hsl(215, 28%, 17%)',
    foregroundColor: 'hsl(220, 13%, 91%)',
    headerBackgroundColor: 'hsl(217, 19%, 27%)',
    headerTextColor: 'hsl(220, 13%, 91%)',
    headerFontWeight: 500,
    rowHoverColor: 'hsl(217, 19%, 22%)',
    accentColor: 'hsl(220, 89%, 53%)',
    fontFamily: 'system-ui',
  });

  readonly gridContext = {
    findGroupForLog: (log: ModelUsageLog) => this.findGroupForLog(log),
    computeDiffSummary: (a: string, b: string) => this.service.computeDiffSummary(a, b),
    handleRating: (log: ModelUsageLog, star: number) => this.handleRating(log, star),
  };

  readonly columnDefs: ColDef[] = [
    {
      headerName: '',
      field: 'expand',
      width: 50,
      sortable: false,
      cellRenderer: ExpandCellRendererComponent,
    },
    {
      headerName: 'Time',
      field: 'createdAt',
      width: 160,
      sortable: true,
      valueFormatter: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: '2-digit',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      },
    },
    {
      headerName: 'Type',
      field: 'modelType',
      width: 100,
      sortable: true,
      cellRenderer: ModelTypeCellRendererComponent,
    },
    {
      headerName: 'Model',
      field: 'modelName',
      flex: 1,
      minWidth: 140,
      sortable: true,
      cellRenderer: ModelNameCellRendererComponent,
    },
    {
      headerName: 'Operation',
      field: 'operationType',
      width: 130,
      sortable: true,
    },
    {
      headerName: 'Usage',
      field: 'usage',
      width: 170,
      sortable: false,
      valueGetter: (params) => {
        const log = params.data as ModelUsageLog;
        return log ? getUsageDisplay(log) : '';
      },
    },
    {
      headerName: 'Diff',
      field: 'diff',
      width: 100,
      sortable: false,
      cellRenderer: DiffCellRendererComponent,
    },
    {
      headerName: 'Per $1',
      field: 'perDollar',
      width: 90,
      sortable: false,
      cellRenderer: PerDollarCellRendererComponent,
    },
    {
      headerName: 'Seconds',
      field: 'processingTimeMs',
      width: 90,
      sortable: true,
      valueFormatter: (params) => {
        const log = params.data as ModelUsageLog;
        if (!log) return '';
        return String(getDurationSeconds(log));
      },
    },
    {
      headerName: 'Rating',
      field: 'rating',
      width: 150,
      sortable: false,
      cellRenderer: RatingCellRendererComponent,
    },
  ];

  readonly defaultColDef: ColDef = {
    resizable: true,
  };

  readonly getRowId = (params: GetRowIdParams) => String(params.data.id);

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

  onCellClicked(event: RowClickedEvent): void {
    const log = event.data as ModelUsageLog;
    if (!log) return;

    if (this.hasContent(log)) {
      this.toggleExpand(log);
    }
  }

  private async handleRating(log: ModelUsageLog, star: number): Promise<void> {
    if (log.modelType !== 'CHAT') return;
    const newRating = log.rating === star ? null : star;
    await this.service.updateRating(log.id, newRating);
    this.refreshGrid();
  }

  onDateFilterChange(value: string): void {
    this.service.dateFilter.set(value);
    this.refreshGrid();
  }

  onModelTypeFilterChange(value: ModelType | 'ALL'): void {
    this.service.modelTypeFilter.set(value);
    this.refreshGrid();
  }

  onOperationTypeFilterChange(value: string): void {
    this.service.operationTypeFilter.set(value);
    this.refreshGrid();
  }

  onModelNameFilterChange(value: string): void {
    this.service.modelNameFilter.set(value);
    this.refreshGrid();
  }

  toggleExpand(log: ModelUsageLog): void {
    if (log.modelType !== 'CHAT') return;
    this.expandedLogId.update(current => current === log.id ? null : log.id);
  }

  isExpanded(log: ModelUsageLog): boolean {
    return this.expandedLogId() === log.id;
  }

  hasContent(log: ModelUsageLog): boolean {
    return log.modelType === 'CHAT' && !!log.responseContent;
  }

  getExpandedLog(): ModelUsageLog | null {
    const id = this.expandedLogId();
    if (id === null) return null;
    return this.currentPageLogs.find(l => l.id === id) ?? null;
  }

  getDiffLines(log: ModelUsageLog): DiffLine[] {
    const group = this.findGroupForLog(log);
    if (!group || !group.primaryLog || log.id === group.primaryLog.id) return [];
    if (!log.responseContent || !group.primaryLog.responseContent) return [];
    return this.service.computeDiff(group.primaryLog.responseContent, log.responseContent);
  }

  isPrimaryLog(log: ModelUsageLog): boolean {
    const group = this.findGroupForLog(log);
    return group?.primaryLog?.id === log.id;
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
  }

  async clearLogs(): Promise<void> {
    await this.service.deleteLogs();
    this.refreshGrid();
  }

  private findGroupForLog(log: ModelUsageLog): OperationGroup | null {
    if (!log.operationId) return null;
    return this.currentGroups.find(g => g.operationId === log.operationId) ?? null;
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

    const dateFilter = this.service.dateFilter();
    const modelTypeFilter = this.service.modelTypeFilter();
    const operationTypeFilter = this.service.operationTypeFilter();
    const modelNameFilter = this.service.modelNameFilter();

    try {
      const response = await this.service.fetchLogs({
        startRow: params.startRow,
        endRow: params.endRow,
        date: dateFilter !== 'ALL' ? dateFilter : undefined,
        modelType: modelTypeFilter !== 'ALL' ? modelTypeFilter : undefined,
        operationType: operationTypeFilter !== 'ALL' ? operationTypeFilter : undefined,
        modelName: modelNameFilter !== 'ALL' ? modelNameFilter : undefined,
        sortField,
        sortDirection,
      });

      this.currentPageLogs = response.rows;
      this.currentGroups = this.service.groupLogs(response.rows);
      this.totalCount.set(response.totalCount);

      params.successCallback(response.rows, response.totalCount);
    } catch {
      params.failCallback();
    }
  }
}
