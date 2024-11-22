import { Injectable, resource, signal } from '@angular/core';
import { Page, WordList } from './parser/types';

type SelectedSource = { sourceId: string; pageNumber: number } | undefined;
type SelectedRectangle = { x: number; y: number; width: number; height: number } | undefined;

@Injectable({
  providedIn: 'root',
})
export class PageService {
  private readonly selectedSource = signal<SelectedSource>(undefined);
  private readonly selectedRectange = signal<SelectedRectangle>(undefined);

  readonly page = resource<Page, { selectedSource: SelectedSource }>({
    request: () => ({ selectedSource: this.selectedSource() }),
    loader: async ({ request: { selectedSource} }) => {
      if (!selectedSource) {
        return;
      }
      const response = await fetch(`/api/source/${selectedSource.sourceId}/page/${selectedSource.pageNumber}`);
      if (!response.ok) {
        throw new Error('Could not load page');
      }
      return response.json();
    },
  });

  readonly words = resource<WordList, { selectedSource: SelectedSource, selectedRectange: SelectedRectangle }>({
    request: () => ({ selectedSource: this.selectedSource(), selectedRectange: this.selectedRectange() }),
    loader: async ({ request: { selectedSource, selectedRectange } }) => {
      if (!selectedSource || !selectedRectange) {
        return;
      }
      const { sourceId, pageNumber } = selectedSource;
      const { x, y, width, height } = selectedRectange;
      const response = await fetch(`/api/source/${sourceId}/page/${pageNumber}/words?x=${x}&y=${y}&width=${width}&height=${height}`);
      if (!response.ok) {
        throw new Error('Could not load word list');
      }
      return response.json();
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
