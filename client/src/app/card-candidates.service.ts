import { Injectable, inject, computed, signal } from '@angular/core';
import { PageService } from './page.service';
import { CardCreationStrategyRegistry } from './card-creation-strategies/card-creation-strategy.registry';
import { ExtractedItem } from './parser/types';

@Injectable({
  providedIn: 'root',
})
export class CardCandidatesService {
  private readonly pageService = inject(PageService);
  private readonly strategyRegistry = inject(CardCreationStrategyRegistry);
  private readonly ignoredIds = signal<Set<string>>(new Set());

  readonly allExtractedItems = computed(() => {
    const selectionRegions = this.pageService.selectionRegions();

    if (!selectionRegions || selectionRegions.length === 0) {
      return [];
    }

    const allItems: ExtractedItem[] = [];

    for (const region of selectionRegions) {
      const result = region.value();
      if (result) {
        allItems.push(...result.items);
      }
    }

    const uniqueItems = allItems.filter((item, index, array) =>
      array.findIndex(i => i.id === item.id) === index
    );

    return uniqueItems;
  });

  readonly candidates = computed(() => {
    const ignored = this.ignoredIds();
    return this.allExtractedItems()
      .filter(item => !item.exists)
      .filter(item => !ignored.has(item.id));
  });

  readonly hasCandidates = computed(() => this.candidates().length > 0);
  readonly candidatesCount = computed(() => this.candidates().length);

  getItemLabel(item: ExtractedItem): string {
    const page = this.pageService.page.value();
    const strategy = this.strategyRegistry.getStrategy(page?.cardType);
    return strategy.getItemLabel(item);
  }

  ignoreItem(itemId: string): void {
    this.ignoredIds.update(ids => {
      const newIds = new Set(ids);
      newIds.add(itemId);
      return newIds;
    });
  }

  clearIgnoredItems(): void {
    this.ignoredIds.set(new Set());
  }
}
