import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SourcesService } from '../../sources.service';
import { DueCardsService } from '../../due-cards.service';
import { State } from 'ts-fsrs';
import { StateComponent } from '../state/state.component';

@Component({
  selector: 'app-source-selector',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    RouterLink,
    StateComponent,
  ],
  templateUrl: './source-selector.component.html',
  styleUrl: './source-selector.component.css',
})
export class SourceSelectorComponent {
  private route = inject(ActivatedRoute);

  readonly selectedSourceId = signal<string | undefined>(undefined);
  readonly selectedPageNumber = signal<number | undefined>(undefined);
  mode = computed(() => (this.selectedPageNumber() ? 'page' : 'study'));

  constructor() {
    this.route.params.subscribe((params) => {
      params['sourceId'] && this.selectedSourceId.set(params['sourceId']);
      params['pageNumber'] &&
        this.selectedPageNumber.set(parseInt(params['pageNumber']));
    });
  }

  private readonly sourcesService = inject(SourcesService);
  private readonly dueCardsService = inject(DueCardsService);

  readonly sources = this.sourcesService.sources.value;
  readonly dueCounts = this.dueCardsService.dueCounts.value;
  readonly loading = computed(
    () =>
      !this.selectedSourceId() ||
      this.sourcesService.sources.isLoading() ||
      this.dueCardsService.dueCounts.isLoading()
  );

  readonly selectedSourceName = computed(() => {
    const selectedId = this.selectedSourceId();
    if (!selectedId) {
      return '';
    }
    return (
      this.sources()?.find((source) => source.id === selectedId)?.name ||
      'Select source'
    );
  });

  getDueCounts(sourceId: string): { state: State; count: number }[] {
    return this.dueCounts()?.filter((c) => c.sourceId === sourceId) ?? [];
  }
}
