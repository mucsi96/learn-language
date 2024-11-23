import { Injectable, resource, signal } from '@angular/core';
import { Page, WordList } from './parser/types';
import { fetchJson } from './utils/fetchJson';

type SelectedSource = { sourceId: string; pageNumber: number } | undefined;
type SelectedRectangle =
  | { x: number; y: number; width: number; height: number }
  | undefined;

@Injectable({
  providedIn: 'root',
})
export class PageService {
  private readonly selectedSource = signal<SelectedSource>(undefined);
  private readonly selectedRectange = signal<SelectedRectangle>(undefined);

  readonly page = resource<Page, { selectedSource: SelectedSource }>({
    request: () => ({ selectedSource: this.selectedSource() }),
    loader: async ({ request: { selectedSource } }) => {
      if (!selectedSource) {
        return;
      }
      return fetchJson(
        `/api/source/${selectedSource.sourceId}/page/${selectedSource.pageNumber}`
      );
    },
  });

  readonly words = resource<
    WordList,
    { selectedSource: SelectedSource; selectedRectange: SelectedRectangle }
  >({
    request: () => ({
      selectedSource: this.selectedSource(),
      selectedRectange: this.selectedRectange(),
    }),
    loader: async ({ request: { selectedSource, selectedRectange } }) => {
      if (!selectedSource || !selectedRectange) {
        return;
      }
      const { sourceId, pageNumber } = selectedSource;
      const { x, y, width, height } = selectedRectange;
      return fetchJson(
        `/api/source/${sourceId}/page/${pageNumber}/words?x=${x}&y=${y}&width=${width}&height=${height}`
      );
    },
  });

  setPage(pageNumber: number) {
    const selectedSource = this.selectedSource();
    if (!selectedSource) {
      return;
    }

    if (selectedSource.pageNumber !== pageNumber) {
      this.selectedSource.set({
        sourceId: selectedSource.sourceId,
        pageNumber,
      });
    }
  }

  setSource(sourceId: string, pageNumber: number) {
    this.selectedSource.set({ sourceId, pageNumber });
  }

  setSelectedRectangle(rectangle: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) {
    this.selectedRectange.set(rectangle);
  }
}
