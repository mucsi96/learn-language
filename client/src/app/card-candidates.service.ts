import { Injectable, inject, computed, signal } from '@angular/core';
import { PageService } from './page.service';
import { CardTypeRegistry } from './cardTypes/card-type.registry';
import { ExtractedItem } from './parser/types';

@Injectable({
  providedIn: 'root',
})
export class CardCandidatesService {
  private readonly pageService = inject(PageService);
  private readonly strategyRegistry = inject(CardTypeRegistry);
  private readonly ignoredIds = signal<Set<string>>(new Set());
  private readonly externalItems = signal<ExtractedItem[]>([]);

  readonly hasExternalItems = computed(() => this.externalItems().length > 0);

  readonly allExtractedItems = computed(() => {
    const regionItems = this.pageService.selectionRegions()
      ?.flatMap((region) => region.value()?.items ?? []) ?? [];

    const merged = [...regionItems, ...this.externalItems()];

    return merged.filter((item, index, array) =>
      array.findIndex((i) => i.id === item.id) === index
    );
  });

  readonly candidates = computed(() => {
    const ignored = this.ignoredIds();
    return this.allExtractedItems()
      .filter(item => !item.exists)
      .filter(item => !item.error)
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

  isIgnored(itemId: string): boolean {
    return this.ignoredIds().has(itemId);
  }

  clearIgnoredItems(): void {
    this.ignoredIds.set(new Set());
  }

  setExternalItems(items: ExtractedItem[]): void {
    this.externalItems.set(items);
  }

  clearExternalItems(): void {
    this.externalItems.set([]);
  }
}
