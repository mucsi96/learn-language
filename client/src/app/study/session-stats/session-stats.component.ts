import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SessionStats } from '../../parser/types';

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function calcAccuracy(goodCount: number, badCount: number): number {
  const total = goodCount + badCount;
  return total > 0 ? Math.round((goodCount / total) * 100) : 0;
}

@Component({
  selector: 'app-session-stats',
  standalone: true,
  imports: [MatIconModule, MatCardModule, MatProgressBarModule],
  templateUrl: './session-stats.component.html',
  styleUrl: './session-stats.component.css',
})
export class SessionStatsComponent {
  stats = input.required<SessionStats>();

  readonly formatDuration = formatDuration;

  readonly accuracy = computed(() => {
    const s = this.stats();
    return calcAccuracy(s.goodCount, s.badCount);
  });

  readonly personStatsWithAccuracy = computed(() =>
    this.stats().personStats.map((person) => ({
      ...person,
      accuracy: calcAccuracy(person.goodCount, person.badCount),
    }))
  );
}
