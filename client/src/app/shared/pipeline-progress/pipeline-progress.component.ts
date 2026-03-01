import { Component, computed, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DotProgress } from '../types/dot-progress.types';
import { ToolPool } from '../../utils/tool-pool';

@Component({
  selector: 'app-pipeline-progress',
  standalone: true,
  imports: [MatTooltipModule],
  templateUrl: './pipeline-progress.component.html',
  styleUrl: './pipeline-progress.component.css',
})
export class PipelineProgressComponent {
  readonly taskLabel = input.required<string>();
  readonly toolLabel = input.required<string>();
  readonly tasks = input.required<DotProgress[]>();
  readonly toolPool = input.required<ToolPool>();

  readonly completedCount = computed(
    () => this.tasks().filter((t) => t.status === 'completed').length
  );
  readonly errorCount = computed(
    () => this.tasks().filter((t) => t.status === 'error').length
  );
  readonly totalCount = computed(() => this.tasks().length);
}
