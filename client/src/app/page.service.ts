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
import { ExtractionRegion, ExtractionRegionSelection, Page } from './parser/types';
import { PagedSelection, SelectionStateService } from './selection-state.service';

type SelectedSource = { sourceId: string; pageNumber: number } | undefined;
type SelectedRectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
};
type ExtractionGroup = PagedSelection[];

@Injectable({
  providedIn: 'root',
})
export class PageService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  private readonly strategyRegistry = inject(CardTypeRegistry);
  private readonly selectionStateService = inject(SelectionStateService);
  private readonly selectedSource = signal<SelectedSource>(undefined);
  private readonly extractionGroups = signal<ExtractionGroup[]>([]);

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
    ExtractionGroup[],
    ResourceRef<ExtractionRegion | undefined>[]
  >({
    source: this.extractionGroups,
    computation: (groups, previous) => untracked(() =>{
      const selectedSource = this.selectedSource();
      const page = this.page.value();
      if (!selectedSource || groups.length === 0) {
        return [];
      }

      const previousResources = previous?.value || [];
      const previousGroups = previous?.source || [];
      const strategy = this.strategyRegistry.getStrategy(page?.cardType);

      return groups.map((group) => {
        const existingIndex = previousGroups.findIndex(
          (prevGroup) => this.groupsEqual(prevGroup, group)
        );

        if (existingIndex !== -1 && previousResources[existingIndex]) {
          return previousResources[existingIndex];
        }

        return resource({
          injector: this.injector,
          loader: async (): Promise<ExtractionRegion> => {
            const { sourceId } = selectedSource;

            const regions = group.map((sel) => ({
              pageNumber: sel.pageNumber,
              ...sel.rectangle,
            }));

            const items = await strategy.extractItems({
              sourceId,
              regions,
            });

            const selections: ExtractionRegionSelection[] = group.map((sel) => ({
              sourceId: sel.sourceId,
              pageNumber: sel.pageNumber,
              rectangle: sel.rectangle,
            }));

            return { selections, items };
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

    this.selectionStateService.clearSelections();
    this.extractionGroups.update((current) => [...current, [...allSelections]]);
  }

  cancelSelection() {
    this.selectionStateService.clearSelections();
    this.extractionGroups.set([]);
  }

  clearExtraction() {
    this.extractionGroups.set([]);
  }

  getAllExtractionSelections(): ExtractionRegionSelection[] {
    return this.extractionGroups().flatMap(group =>
      group.map(sel => ({
        sourceId: sel.sourceId,
        pageNumber: sel.pageNumber,
        rectangle: sel.rectangle,
      }))
    );
  }

  private groupsEqual(a: ExtractionGroup, b: ExtractionGroup): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((selA, i) => {
      const selB = b[i];
      return selA.sourceId === selB.sourceId &&
        selA.pageNumber === selB.pageNumber &&
        selA.rectangle.x === selB.rectangle.x &&
        selA.rectangle.y === selB.rectangle.y &&
        selA.rectangle.width === selB.rectangle.width &&
        selA.rectangle.height === selB.rectangle.height;
    });
  }
}
