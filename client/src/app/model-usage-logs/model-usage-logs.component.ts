import { Component, inject, computed } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { ModelUsageLogsService, ModelUsageLog } from './model-usage-logs.service';

@Component({
  selector: 'app-model-usage-logs',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    DatePipe,
    DecimalPipe,
  ],
  templateUrl: './model-usage-logs.component.html',
  styleUrl: './model-usage-logs.component.css',
})
export class ModelUsageLogsComponent {
  private readonly service = inject(ModelUsageLogsService);

  readonly logs = this.service.logs.value;
  readonly loading = computed(() => this.service.logs.isLoading());

  readonly displayedColumns: string[] = [
    'createdAt',
    'modelType',
    'modelName',
    'operationType',
    'usage',
    'cost',
    'time',
  ];

  readonly skeletonData = Array(5).fill({});

  readonly totalCost = computed(() => {
    const logsList = this.logs();
    if (!logsList) return 0;
    return logsList.reduce((sum, log) => sum + (log.costUsd || 0), 0);
  });

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
}
