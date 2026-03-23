import { Component, computed, input } from '@angular/core';
import { SessionStats } from '../../parser/types';
import { StatsGridComponent } from '../stats-grid/stats-grid.component';

function calcAccuracy(goodCount: number, badCount: number): number {
  const total = goodCount + badCount;
  return total > 0 ? Math.round((goodCount / total) * 100) : 0;
}

@Component({
  selector: 'app-session-stats',
  standalone: true,
  imports: [StatsGridComponent],
  templateUrl: './session-stats.component.html',
  styleUrl: './session-stats.component.css',
})
export class SessionStatsComponent {
  stats = input.required<SessionStats>();

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
