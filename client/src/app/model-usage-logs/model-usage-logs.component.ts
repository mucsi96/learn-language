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
  type ICellRendererParams,
  ModuleRegistry,
  InfiniteRowModelModule,
  ClientSideRowModelModule,
  ValidationModule,
  themeMaterial,
  colorSchemeDarkBlue,
} from 'ag-grid-community';
import { ModelUsageLogsService, ModelUsageLog, ModelType, OperationGroup, DiffLine, OperationTypeSummaryGroup } from './model-usage-logs.service';

const MODEL_TYPE_ICONS: Record<string, string> = {
  CHAT: 'chat',
  IMAGE: 'image',
  AUDIO: 'volume_up',
};

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

const getPerDollarCount = (log: ModelUsageLog): number => {
  if (!log.costUsd || log.costUsd === 0) return 0;
  return Math.floor(1 / log.costUsd);
};

const getDurationSeconds = (log: ModelUsageLog): number => {
  return log.processingTimeMs / 1000;
};

ModuleRegistry.registerModules([
  InfiniteRowModelModule,
  ClientSideRowModelModule,
  ValidationModule,
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

  readonly columnDefs: ColDef[] = [
    {
      headerName: '',
      field: 'expand',
      width: 50,
      sortable: false,
      cellRenderer: (params: ICellRendererParams) => {
        const log = params.data as ModelUsageLog;
        if (!log || log.modelType !== 'CHAT' || !log.responseContent) return '';
        return '<span class="expand-icon" role="button" aria-label="Expand">▶</span>';
      },
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
      cellRenderer: (params: ICellRendererParams) => {
        if (!params.value) return '';
        const icon = MODEL_TYPE_ICONS[params.value] ?? 'help';
        return `<span style="display:inline-flex;align-items:center;gap:4px"><span class="material-icons" style="font-size:18px;color:var(--mat-sys-primary,#6c9eff)">${icon}</span><span style="font-size:0.75rem;text-transform:uppercase">${params.value}</span></span>`;
      },
    },
    {
      headerName: 'Model',
      field: 'modelName',
      flex: 1,
      minWidth: 140,
      sortable: true,
      cellRenderer: (params: ICellRendererParams) => {
        const log = params.data as ModelUsageLog;
        if (!log) return '';
        const group = this.findGroupForLog(log);
        const isPrimary = group && group.primaryLog?.id === log.id && group.logs.length > 1;
        const badge = isPrimary
          ? ' <span style="padding:1px 4px;border-radius:4px;font-size:0.625rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:var(--mat-sys-on-primary,#fff);background:var(--mat-sys-primary,#6c9eff);vertical-align:middle;margin-left:4px">primary</span>'
          : '';
        return `<span style="font-family:monospace;font-size:0.875rem">${log.modelName}</span>${badge}`;
      },
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
      cellRenderer: (params: ICellRendererParams) => {
        const log = params.data as ModelUsageLog;
        if (!log) return '';
        const group = this.findGroupForLog(log);
        if (!group || !group.primaryLog || group.logs.length <= 1 || log.id === group.primaryLog.id) return '';
        if (!log.responseContent || !group.primaryLog.responseContent) return '';
        const diff = this.service.computeDiffSummary(group.primaryLog.responseContent, log.responseContent);
        if (diff.additions === 0 && diff.deletions === 0) {
          return '<span style="color:var(--mat-sys-outline);font-style:italic;font-size:0.75rem">identical</span>';
        }
        const addPart = diff.additions > 0 ? `<span style="color:#4caf50;font-weight:600">+${diff.additions}</span>` : '';
        const delPart = diff.deletions > 0 ? `<span style="color:#f44336;font-weight:600">-${diff.deletions}</span>` : '';
        return `<span style="font-family:monospace;font-size:0.8125rem;display:inline-flex;gap:0.5rem">${addPart}${delPart}</span>`;
      },
    },
    {
      headerName: 'Per $1',
      field: 'perDollar',
      width: 90,
      sortable: false,
      cellRenderer: (params: ICellRendererParams) => {
        const log = params.data as ModelUsageLog;
        if (!log) return '';
        return `<span style="font-family:monospace;color:var(--mat-sys-tertiary,#8bb)">${getPerDollarCount(log)}</span>`;
      },
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
      cellRenderer: (params: ICellRendererParams) => {
        const log = params.data as ModelUsageLog;
        if (!log || log.modelType !== 'CHAT') return '';
        const stars = [1, 2, 3, 4, 5].map(star => {
          const filled = log.rating != null && star <= log.rating;
          const icon = filled ? 'star' : 'star_border';
          const color = filled ? '#ffc107' : 'rgba(255,255,255,0.4)';
          return `<span class="material-icons rating-star" data-star="${star}" style="font-size:18px;cursor:pointer;color:${color}" role="button" aria-label="Rate ${star} stars">${icon}</span>`;
        }).join('');
        return `<span style="display:inline-flex;gap:0">${stars}</span>`;
      },
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

    const target = event.event?.target as HTMLElement;

    if (target?.classList.contains('rating-star')) {
      const star = Number(target.dataset['star']);
      if (star >= 1 && star <= 5) {
        this.handleRating(log, star);
        return;
      }
    }

    if (target?.classList.contains('expand-icon') || this.hasContent(log)) {
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
