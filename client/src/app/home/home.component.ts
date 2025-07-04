import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBadgeModule } from '@angular/material/badge';
import { RouterLink } from '@angular/router';
import { SourcesService } from '../sources.service';
import { DueCardsService } from '../due-cards.service';
import { State } from 'ts-fsrs';

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    MatBadgeModule,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  private readonly sourcesService = inject(SourcesService);
  private readonly dueCardsService = inject(DueCardsService);
  readonly sources = this.sourcesService.sources.value;
  readonly dueCounts = this.dueCardsService.dueCounts.value;
  readonly loading = computed(
    () =>
      this.sourcesService.sources.isLoading() ||
      this.dueCardsService.dueCounts.isLoading()
  );

  getDueCounts(sourceId: string): { state: State; count: number }[] {
    return this.dueCounts()?.filter((c) => c.sourceId === sourceId) ?? [];
  }

  getTotalDueCount(sourceId: string): number {
    return this.getDueCounts(sourceId).reduce(
      (acc, curr) => acc + curr.count,
      0
    );
  }

  private readonly stateNames = new Map<State, string>([
    [State.New, 'New'],
    [State.Learning, 'Learning'],
    [State.Review, 'Review'],
    [State.Relearning, 'Relearning'],
  ]);
  private readonly stateColorMap = new Map<State, string>([
    [State.New, '#2196F3'], // Blue
    [State.Learning, '#4CAF50'], // Green
    [State.Review, '#FFC107'], // Amber
    [State.Relearning, '#F44336'], // Red
  ]);

  getStateStyle(state: State): { [key: string]: string } {
    const colorInfo = this.stateColorMap.get(state);
    return {
      'background-color': colorInfo || '#ccc',
      color: '#fff',
    };
  }

  getStateName(state: State): string {
    return this.stateNames.get(state) || 'Unknown';
  }
}
