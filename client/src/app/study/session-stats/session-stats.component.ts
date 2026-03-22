import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SessionStats } from '../../parser/types';

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

@Component({
  selector: 'app-session-stats',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './session-stats.component.html',
  styleUrl: './session-stats.component.css',
})
export class SessionStatsComponent {
  stats = input.required<SessionStats>();

  readonly formatDuration = formatDuration;

  get accuracy(): number {
    const s = this.stats();
    const total = s.goodCount + s.badCount;
    return total > 0 ? Math.round((s.goodCount / total) * 100) : 0;
  }

  personAccuracy(goodCount: number, badCount: number): number {
    const total = goodCount + badCount;
    return total > 0 ? Math.round((goodCount / total) * 100) : 0;
  }
}
