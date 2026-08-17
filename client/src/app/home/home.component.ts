import { Component, computed, inject } from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { BarLoaderComponent } from '@mucsi96/angular-material-theme';
import { RouterLink } from '@angular/router';
import { SourcesService } from '../sources.service';
import { SourceGroupsService, SourceGroup } from '../source-groups/source-groups.service';
import { DueCardsService } from '../due-cards.service';
import { StateComponent } from '../shared/state/state.component';
import { CardState } from '../shared/state/card-state';
import { Source } from '../parser/types';

type SourceGroupSection = {
  group: SourceGroup;
  sources: Source[];
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    NgTemplateOutlet,
    BarLoaderComponent,
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
  private readonly groupsService = inject(SourceGroupsService);
  private readonly dueCardsService = inject(DueCardsService);
  readonly sources = this.sourcesService.sources.value;
  readonly groups = this.groupsService.groups.value;
  readonly dueCounts = this.dueCardsService.dueCounts.value;
  readonly loading = computed(
    () =>
      this.sourcesService.sources.isLoading() ||
      this.groupsService.groups.isLoading() ||
      this.dueCardsService.dueCounts.isLoading()
  );

  readonly groupedSections = computed<SourceGroupSection[]>(() => {
    const sources = this.sources() ?? [];
    return (this.groups() ?? [])
      .map((group) => ({
        group,
        sources: sources.filter((source) => source.groupId === group.id),
      }))
      .filter((section) => section.sources.length > 0);
  });

  readonly ungroupedSources = computed(() =>
    (this.sources() ?? []).filter((source) => !source.groupId)
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
