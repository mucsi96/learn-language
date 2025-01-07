import { inject, Injectable, resource, signal } from '@angular/core';
import { Page, WordList } from './parser/types';
import { fetchJson } from './utils/fetchJson';
import { HttpClient } from '@angular/common/http';
import { VisibilityService } from './visibility.service';

type SelectedSource = { sourceId: string; pageNumber: number } | undefined;
type SelectedRectangle =
  | { x: number; y: number; width: number; height: number }
  | undefined;

@Injectable({
  providedIn: 'root',
})
export class PageService {
  private readonly http = inject(HttpClient);
  private readonly selectedSource = signal<SelectedSource>(undefined);
  private readonly selectedRectange = signal<SelectedRectangle>(undefined);
  private readonly visibility = inject(VisibilityService).visibility;

  readonly page = resource<
    Page | undefined,
    { selectedSource: SelectedSource; visibility: boolean }
  >({
    request: () => ({
      selectedSource: this.selectedSource(),
      visibility: this.visibility(),
    }),
    loader: async ({ request: { selectedSource, visibility } }) => {
      if (!selectedSource || !visibility) {
        return;
      }
      return fetchJson<Page>(
        this.http,
        `/api/source/${selectedSource.sourceId}/page/${selectedSource.pageNumber}`
      );
    },
  });

  readonly words = resource<
    WordList | undefined,
    {
      selectedSource: SelectedSource;
      selectedRectange: SelectedRectangle;
      visibility: boolean;
    }
  >({
    request: () => ({
      selectedSource: this.selectedSource(),
      selectedRectange: this.selectedRectange(),
      visibility: this.visibility(),
    }),
    loader: async ({
      request: { selectedSource, selectedRectange, visibility },
    }) => {
      if (!selectedSource || !selectedRectange || !visibility) {
        return;
      }
      const { sourceId, pageNumber } = selectedSource;
      const { x, y, width, height } = selectedRectange;
      return fetchJson<WordList>(
        this.http,
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
