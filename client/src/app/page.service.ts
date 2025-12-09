import {
  inject,
  Injectable,
  resource,
  signal,
  linkedSignal,
  ResourceRef,
  Injector,
  untracked,
} from '@angular/core';
import { Page, WordList, Region } from './parser/types';
import { fetchJson } from './utils/fetchJson';
import { HttpClient } from '@angular/common/http';

type SelectedSource = { sourceId: string; pageNumber: number } | undefined;
type SelectedRectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
};
type SelectedRectangles = SelectedRectangle[];
type SelectionMode = 'immediate' | 'grouped';

@Injectable({
  providedIn: 'root',
})
export class PageService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  private readonly selectedSource = signal<SelectedSource>(undefined);
  private readonly selectedRectangles = signal<SelectedRectangles>([]);
  readonly selectionMode = signal<SelectionMode>('immediate');
  readonly regionGroup = signal<Region[]>([]);
  readonly groupedWordsResource = signal<ResourceRef<WordList | undefined> | undefined>(undefined);

  readonly page = resource({
    params: () => ({
      selectedSource: this.selectedSource(),
    }),
    loader: async ({ params: { selectedSource } }) => {
      if (!selectedSource) {
        return;
      }

      return fetchJson<Page>(
        this.http,
        `/api/source/${selectedSource.sourceId}/page/${selectedSource.pageNumber}`
      );
    },
  });

  readonly selectionRegions = linkedSignal<
    SelectedRectangles,
    ResourceRef<WordList | undefined>[]
  >({
    source: this.selectedRectangles,
    computation: (selectedRectangles, previous) => untracked(() =>{
      const selectedSource = this.selectedSource();
      const mode = this.selectionMode();

      if (!selectedSource || selectedRectangles.length === 0 || mode === 'grouped') {
        return [];
      }

      const previousResources = previous?.value || [];
      const previousRectangles = previous?.source || [];

      return selectedRectangles.map((rectangle) => {
        const existingIndex = previousRectangles.findIndex(
          (prevRect) =>
            prevRect.x === rectangle.x &&
            prevRect.y === rectangle.y &&
            prevRect.width === rectangle.width &&
            prevRect.height === rectangle.height
        );

        if (existingIndex !== -1 && previousResources[existingIndex]) {
          return previousResources[existingIndex];
        }

        return resource({
          injector: this.injector,
          loader: async () => {
            const { sourceId, pageNumber } = selectedSource;
            const { x, y, width, height } = rectangle;
            return fetchJson<WordList>(
              this.http,
              `/api/source/${sourceId}/page/${pageNumber}/words?x=${x}&y=${y}&width=${width}&height=${height}`
            );
          },
        });
      });
    }),
  });

  reload() {
    this.page.reload();
    this.selectionRegions().forEach((region) => {
      region.reload();
    });
  }

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
      this.clearSelection();
    }
  }

  setSource(sourceId: string, pageNumber: number) {
    this.selectedSource.set({ sourceId, pageNumber });
  }

  addSelectedRectangle(rectangle: SelectedRectangle) {
    const mode = this.selectionMode();
    const selectedSource = this.selectedSource();

    if (!selectedSource) {
      return;
    }

    if (mode === 'grouped') {
      this.regionGroup.update((regions) => {
        const region: Region = {
          pageNumber: selectedSource.pageNumber,
          ...rectangle,
        };

        const hasOverlap = regions.some(existing =>
          existing.pageNumber === region.pageNumber &&
          this.rectanglesOverlap(existing, region)
        );

        if (hasOverlap) {
          return regions;
        }

        return [...regions, region];
      });
    } else {
      this.selectedRectangles.update((rectangles) => {
        const hasOverlap = rectangles.some(existing =>
          this.rectanglesOverlap(existing, rectangle)
        );

        if (hasOverlap) {
          return rectangles;
        }

        return [...rectangles, rectangle];
      });
    }
  }

  private rectanglesOverlap(rect1: SelectedRectangle, rect2: SelectedRectangle): boolean {
    return !(
      rect1.x + rect1.width <= rect2.x ||
      rect2.x + rect2.width <= rect1.x ||
      rect1.y + rect1.height <= rect2.y ||
      rect2.y + rect2.height <= rect1.y
    );
  }

  clearSelection() {
    this.selectedRectangles.set([]);
    this.clearRegionGroup();
  }

  toggleSelectionMode() {
    const currentMode = this.selectionMode();
    this.selectionMode.set(currentMode === 'immediate' ? 'grouped' : 'immediate');
    this.clearSelection();
  }

  clearRegionGroup() {
    this.regionGroup.set([]);
    this.groupedWordsResource.set(undefined);
  }

  processRegionGroup() {
    const selectedSource = this.selectedSource();
    const regions = this.regionGroup();

    if (!selectedSource || regions.length === 0) {
      return;
    }

    const wordListResource = resource({
      injector: this.injector,
      loader: async () => {
        return fetchJson<WordList>(
          this.http,
          `/api/source/${selectedSource.sourceId}/words/multi-region`,
          {
            method: 'POST',
            body: { regions },
          }
        );
      },
    });

    this.groupedWordsResource.set(wordListResource);
  }
}
