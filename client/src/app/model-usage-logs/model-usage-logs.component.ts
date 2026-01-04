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
import { ModelUsageLogsService, ModelUsageLog, ModelType } from './model-usage-logs.service';

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
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './model-usage-logs.component.html',
  styleUrl: './model-usage-logs.component.css',
})
export class ModelUsageLogsComponent {
  private readonly service = inject(ModelUsageLogsService);

  readonly logs = this.service.filteredAndSortedLogs;
  readonly summary = this.service.summary.value;
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
}
