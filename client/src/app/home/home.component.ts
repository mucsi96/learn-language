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
import { StateComponent } from '../shared/state/state.component';
import { CardState } from '../shared/state/card-state';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterLink,
    MatBadgeModule,
    StateComponent,
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

  getDueCounts(sourceId: string): { state: CardState; count: number }[] {
    return this.dueCounts()?.filter((c) => c.sourceId === sourceId) ?? [];
  }

  getTotalDueCount(sourceId: string): number {
    return this.getDueCounts(sourceId).reduce(
      (acc, curr) => acc + curr.count,
      0
    );
  }

  hasDueCards(sourceId: string): boolean {
    return this.getTotalDueCount(sourceId) > 0;
  }
}
