import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { injectParams, injectRouteData } from '../../utils/inject-params';
import { SourcesService } from '../../sources.service';
import { DueCardsService } from '../../due-cards.service';
import { CardState } from '../state/card-state';
import { StateComponent } from '../state/state.component';
import { Source } from '../../parser/types';

@Component({
  selector: 'app-source-selector',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatMenuModule, RouterLink, StateComponent],
  templateUrl: './source-selector.component.html',
  styleUrl: './source-selector.component.css',
})
export class SourceSelectorComponent {
  private readonly routeSourceId = injectParams('sourceId');
  private readonly routePageNumber = injectParams('pageNumber');
  public readonly mode = injectRouteData('mode');

  readonly selectedSourceId = signal<string | undefined>(undefined);
  readonly selectedPageNumber = signal<number | undefined>(undefined);

  constructor() {
    effect(() => {
      const sourceId = this.routeSourceId();
      if (sourceId) {
        this.selectedSourceId.set(String(sourceId));
      }
    });

    effect(() => {
      const pageNumber = this.routePageNumber();
      if (pageNumber) {
        this.selectedPageNumber.set(parseInt(String(pageNumber)));
      }
    });
  }

  private readonly sourcesService = inject(SourcesService);
  private readonly dueCardsService = inject(DueCardsService);

  readonly sources = this.sourcesService.sources.value;
  readonly dueCounts = this.dueCardsService.dueCounts.value;

  readonly loading = computed(
    () =>
      !this.selectedSourceId() || this.sourcesService.sources.isLoading() || this.dueCardsService.dueCounts.isLoading()
  );

  readonly selectedSourceName = computed(() => {
    const selectedId = this.selectedSourceId();
    if (!selectedId) {
      return '';
    }
    return this.sources()?.find((source) => source.id === selectedId)?.name || 'Select source';
  });

  getSourceLink(source: Source): string[] {
    const mode = this.mode();

    if (!mode) {
      throw new Error('Route mode is not set');
    }

    switch (mode) {
      case 'study':
        return ['/sources', source.id, 'study'];
      case 'cards':
        return ['/sources', source.id, 'cards'];
      case 'admin':
        return source.sourceType === 'ebookDictionary'
          ? ['/sources', source.id, 'cards']
          : ['/sources', source.id, 'page', String(source.startPage)];
      default:
        throw new Error(`Unknown route mode: ${mode}`);
    }
  }

  getSourceLinkQueryParams(source: Source): Record<string, string> | null {
    const mode = this.mode();
    if (mode === 'admin' && source.sourceType === 'ebookDictionary') {
      return { draft: 'true' };
    }
    return null;
  }

  getDueCounts(sourceId: string): { state: CardState; count: number }[] {
    return this.dueCounts()?.filter((c) => c.sourceId === sourceId) ?? [];
  }
}
