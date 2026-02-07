import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ModelUsageLogsService, ModelUsageLog, ModelType, OperationGroup, DiffLine, OperationTypeSummaryGroup } from './model-usage-logs.service';

@Component({
  selector: 'app-model-usage-logs',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatButtonModule,
    MatTabsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './model-usage-logs.component.html',
  styleUrl: './model-usage-logs.component.css',
})
export class ModelUsageLogsComponent {
  private readonly service = inject(ModelUsageLogsService);

  readonly logs = this.service.filteredAndSortedLogs;
  readonly groups = this.service.groupedLogs;
  readonly summary = this.service.summary.value;
  readonly groupedSummary = this.service.groupedSummary;
  readonly loading = computed(() => this.service.logs.isLoading());
  readonly expandedLogId = signal<number | null>(null);
  readonly ratingStars = [1, 2, 3, 4, 5];

  readonly availableDates = this.service.availableDates;
  readonly availableModelTypes = this.service.availableModelTypes;
  readonly availableOperationTypes = this.service.availableOperationTypes;
  readonly availableModelNames = this.service.availableModelNames;

  readonly dateFilter = this.service.dateFilter;
  readonly modelTypeFilter = this.service.modelTypeFilter;
  readonly operationTypeFilter = this.service.operationTypeFilter;
  readonly modelNameFilter = this.service.modelNameFilter;
  readonly hasAnyLogs = this.service.hasAnyLogs;

  readonly displayedColumns: string[] = [
    'expand',
    'createdAt',
    'modelType',
    'modelName',
    'operationType',
    'usage',
    'diff',
    'cost',
    'time',
    'rating',
  ];

  readonly summaryColumns: string[] = [
    'modelName',
    'totalCalls',
    'ratedCalls',
    'averageRating',
    'totalCost',
  ];

  readonly skeletonData = Array(5).fill({});

  readonly totalCost = computed(() => {
    const logsList = this.logs();
    if (!logsList) return 0;
    return logsList.reduce((sum, log) => sum + (log.costUsd || 0), 0);
  });

  readonly canDelete = computed(() => this.dateFilter() !== 'ALL');

  readonly flatLogRows = computed<{ log: ModelUsageLog; group: OperationGroup; isFirst: boolean; isGrouped: boolean }[]>(() => {
    const groupsList = this.groups();
    return groupsList.flatMap(group =>
      group.logs.map((log, idx) => ({
        log,
        group,
        isFirst: idx === 0,
        isGrouped: group.logs.length > 1,
      }))
    );
  });

  onDateFilterChange(value: string): void {
    this.service.dateFilter.set(value);
  }

  onModelTypeFilterChange(value: ModelType | 'ALL'): void {
    this.service.modelTypeFilter.set(value);
  }

  onOperationTypeFilterChange(value: string): void {
    this.service.operationTypeFilter.set(value);
  }

  onModelNameFilterChange(value: string): void {
    this.service.modelNameFilter.set(value);
  }

  getUsageDisplay(log: ModelUsageLog): string {
    if (log.modelType === 'CHAT') {
      return `${log.inputTokens ?? 0} / ${log.outputTokens ?? 0} tokens`;
    } else if (log.modelType === 'IMAGE') {
      return `${log.imageCount ?? 0} image(s)`;
    } else if (log.modelType === 'AUDIO') {
      return `${log.inputCharacters ?? 0} chars`;
    }
    return '-';
  }

  getPerDollarCount(log: ModelUsageLog): number {
    if (!log.costUsd || log.costUsd === 0) return 0;
    return Math.floor(1 / log.costUsd);
  }

  getDurationSeconds(log: ModelUsageLog): number {
    return log.processingTimeMs / 1000;
  }

  getModelTypeIcon(type: string): string {
    switch (type) {
      case 'CHAT': return 'chat';
      case 'IMAGE': return 'image';
      case 'AUDIO': return 'volume_up';
      default: return 'help';
    }
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

  isRatable(log: ModelUsageLog): boolean {
    return log.modelType === 'CHAT';
  }

  async setRating(log: ModelUsageLog, rating: number, event: Event): Promise<void> {
    event.stopPropagation();
    if (!this.isRatable(log)) return;
    const newRating = log.rating === rating ? null : rating;
    await this.service.updateRating(log.id, newRating);
  }

  getStarClass(log: ModelUsageLog, star: number): string {
    if (log.rating && star <= log.rating) {
      return 'star-filled';
    }
    return 'star-empty';
  }

  getDiffSummaryForLog(log: ModelUsageLog, group: OperationGroup): { additions: number; deletions: number } | null {
    if (!group.primaryLog || group.logs.length <= 1) return null;
    if (log.id === group.primaryLog.id) return null;
    if (!log.responseContent || !group.primaryLog.responseContent) return null;
    return this.service.computeDiffSummary(group.primaryLog.responseContent, log.responseContent);
  }

  getDiffLines(log: ModelUsageLog, group: OperationGroup): DiffLine[] {
    if (!group.primaryLog || log.id === group.primaryLog.id) return [];
    if (!log.responseContent || !group.primaryLog.responseContent) return [];
    return this.service.computeDiff(group.primaryLog.responseContent, log.responseContent);
  }

  isPrimaryLog(log: ModelUsageLog, group: OperationGroup): boolean {
    return group.primaryLog?.id === log.id;
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text);
  }

  async clearLogs(): Promise<void> {
    await this.service.deleteLogs();
  }
}
