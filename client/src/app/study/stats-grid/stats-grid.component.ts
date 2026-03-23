import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

@Component({
  selector: 'app-stats-grid',
  standalone: true,
  imports: [MatIconModule, MatCardModule, MatProgressBarModule],
  templateUrl: './stats-grid.component.html',
  styleUrl: './stats-grid.component.css',
})
export class StatsGridComponent {
  totalDurationMs = input.required<number>();
  averageDurationMs = input.required<number>();
  goodCount = input.required<number>();
  badCount = input.required<number>();
  accuracyLabel = input<string | null>(null);

  readonly formatDuration = formatDuration;

  readonly accuracy = computed(() => {
    const total = this.goodCount() + this.badCount();
    return total > 0 ? Math.round((this.goodCount() / total) * 100) : 0;
  });
}
