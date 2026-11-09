import { Component, input } from '@angular/core';
import { SessionStats } from '../../parser/types';
import { StatsGridComponent } from '../stats-grid/stats-grid.component';

@Component({
  selector: 'app-session-stats',
  standalone: true,
  imports: [StatsGridComponent],
  templateUrl: './session-stats.component.html',
  styleUrl: './session-stats.component.css',
})
export class SessionStatsComponent {
  stats = input.required<SessionStats>();
}
