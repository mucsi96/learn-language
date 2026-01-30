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
import { fetchJson } from './utils/fetchJson';
import { fetchAsset } from './utils/fetchAsset';
import { HttpClient } from '@angular/common/http';
import { CardTypeRegistry } from './cardTypes/card-type.registry';
import { ExtractionRegion, Page } from './parser/types';
import { SelectionStateService } from './selection-state.service';

type SelectedSource = { sourceId: string; pageNumber: number } | undefined;
type SelectedRectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
};
type SelectedRectangles = SelectedRectangle[];

@Injectable({
  providedIn: 'root',
})
export class PageService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  private readonly strategyRegistry = inject(CardTypeRegistry);
  private readonly selectionStateService = inject(SelectionStateService);
  private readonly selectedSource = signal<SelectedSource>(undefined);
  private readonly extractionRectangles = signal<SelectedRectangles>([]);

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

  readonly documentImage = resource({
    params: () => ({
      page: this.page.value(),
    }),
    loader: async ({ params: { page } }) => {
      if (!page || page.sourceType !== 'images' || !page.hasImage) {
        return null;
      }

      return fetchAsset(
        this.http,
        `/api/source/${page.sourceId}/document/${page.number}/image`
      );
    },
  });

  readonly selectionRegions = linkedSignal<
    SelectedRectangles,
    ResourceRef<ExtractionRegion | undefined>[]
  >({
    source: this.extractionRectangles,
    computation: (selectedRectangles, previous) => untracked(() =>{
      const selectedSource = this.selectedSource();
      const page = this.page.value();
      if (!selectedSource || selectedRectangles.length === 0) {
        return [];
      }

      const previousResources = previous?.value || [];
      const previousRectangles = previous?.source || [];
      const strategy = this.strategyRegistry.getStrategy(page?.cardType);

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
          loader: async (): Promise<ExtractionRegion> => {
            const { sourceId, pageNumber } = selectedSource;

            const items = await strategy.extractItems({
              sourceId,
              pageNumber,
              ...rectangle,
            });

            return { rectangle, items };
          },
        });
      });
    }),
  });

  reload() {
    this.page.reload();
    this.documentImage.reload();
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
    }
  }

  setSource(sourceId: string, pageNumber: number) {
    this.selectedSource.set({ sourceId, pageNumber });
  }

  addSelectedRectangle(rectangle: SelectedRectangle) {
    const selectedSource = this.selectedSource();
    if (!selectedSource) {
      return;
    }

    this.selectionStateService.addSelection({
      sourceId: selectedSource.sourceId,
      pageNumber: selectedSource.pageNumber,
      rectangle,
    });
  }

  confirmSelection() {
    const allSelections = this.selectionStateService.allSelections();
    if (allSelections.length === 0) {
      return;
    }

    const firstSelection = allSelections[0];
    this.extractionRectangles.set([firstSelection.rectangle]);
  }

  cancelSelection() {
    this.selectionStateService.clearSelections();
    this.extractionRectangles.set([]);
  }

  clearExtraction() {
    this.extractionRectangles.set([]);
  }
}
