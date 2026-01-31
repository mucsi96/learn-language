import { computed, Injectable, signal } from '@angular/core';

export type SelectionRectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PagedSelection = {
  sourceId: string;
  pageNumber: number;
  rectangle: SelectionRectangle;
};

@Injectable({
  providedIn: 'root',
})
export class SelectionStateService {
  private readonly selections = signal<PagedSelection[]>([]);

  readonly allSelections = this.selections.asReadonly();

  readonly hasSelections = computed(() => this.selections().length > 0);

  readonly selectionCount = computed(() => this.selections().length);

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

  removeSelection(selection: PagedSelection) {
    this.selections.update((current) =>
      current.filter(
        (s) =>
          s.sourceId !== selection.sourceId ||
          s.pageNumber !== selection.pageNumber ||
          !this.rectanglesEqual(s.rectangle, selection.rectangle)
      )
    );
  }

  clearSelections() {
    this.selections.set([]);
  }

  private rectanglesOverlap(
    rect1: SelectionRectangle,
    rect2: SelectionRectangle
  ): boolean {
    return !(
      rect1.x + rect1.width <= rect2.x ||
      rect2.x + rect2.width <= rect1.x ||
      rect1.y + rect1.height <= rect2.y ||
      rect2.y + rect2.height <= rect1.y
    );
  }

  private rectanglesEqual(
    rect1: SelectionRectangle,
    rect2: SelectionRectangle
  ): boolean {
    return (
      rect1.x === rect2.x &&
      rect1.y === rect2.y &&
      rect1.width === rect2.width &&
      rect1.height === rect2.height
    );
  }
}
