import { computed, Injectable, signal } from '@angular/core';

export type PagedSelection = {
  sourceId: string;
  pageNumber: number;
  rectangle: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

@Injectable({
  providedIn: 'root',
})
export class SelectionStateService {
  private readonly selections = signal<PagedSelection[]>([]);

  readonly allSelections = this.selections.asReadonly();

  readonly hasSelections = computed(() => this.selections().length > 0);

  readonly selectionCount = computed(() => this.selections().length);

  getSelectionsForPage(sourceId: string, pageNumber: number) {
    return computed(() =>
      this.selections()
        .map((selection, index) => ({ ...selection, index: index + 1 }))
        .filter(
          (s) => s.sourceId === sourceId && s.pageNumber === pageNumber
        )
    );
  }

  addSelection(selection: PagedSelection) {
    this.selections.update((current) => {
      const hasOverlap = current.some(
        (existing) =>
          existing.sourceId === selection.sourceId &&
          existing.pageNumber === selection.pageNumber &&
          this.rectanglesOverlap(existing.rectangle, selection.rectangle)
      );

      if (hasOverlap) {
        return current;
      }

      return [...current, selection];
    });
  }

  removeSelection(index: number) {
    this.selections.update((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  clearSelections() {
    this.selections.set([]);
  }

  private rectanglesOverlap(
    rect1: PagedSelection['rectangle'],
    rect2: PagedSelection['rectangle']
  ): boolean {
    return !(
      rect1.x + rect1.width <= rect2.x ||
      rect2.x + rect2.width <= rect1.x ||
      rect1.y + rect1.height <= rect2.y ||
      rect2.y + rect2.height <= rect1.y
    );
  }
}
