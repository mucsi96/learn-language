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
import { ExtractionRegion, Page, RegionCoordinates } from './parser/types';

type SelectedSource = { sourceId: string; pageNumber: number } | undefined;
type SelectedRectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
};
type RegionGroup = {
  regions: (SelectedRectangle & { pageNumber: number })[];
};
type RegionGroups = RegionGroup[];

@Injectable({
  providedIn: 'root',
})
export class PageService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  private readonly strategyRegistry = inject(CardTypeRegistry);
  private readonly selectedSource = signal<SelectedSource>(undefined);
  private readonly regionGroups = signal<RegionGroups>([]);

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
    RegionGroups,
    ResourceRef<ExtractionRegion | undefined>[]
  >({
    source: this.regionGroups,
    computation: (regionGroups, previous) => untracked(() =>{
      const selectedSource = this.selectedSource();
      const page = this.page.value();
      if (!selectedSource || regionGroups.length === 0) {
        return [];
      }

      const previousResources = previous?.value || [];
      const previousGroups = previous?.source || [];
      const strategy = this.strategyRegistry.getStrategy(page?.cardType);

      return regionGroups.map((group) => {
        const existingIndex = previousGroups.findIndex(
          (prevGroup) => this.regionGroupsEqual(prevGroup, group)
        );

        if (existingIndex !== -1 && previousResources[existingIndex]) {
          return previousResources[existingIndex];
        }

        return resource({
          injector: this.injector,
          loader: async (): Promise<ExtractionRegion> => {
            const { sourceId } = selectedSource;
            const regions: RegionCoordinates[] = group.regions.map(r => ({
              pageNumber: r.pageNumber,
              x: r.x,
              y: r.y,
              width: r.width,
              height: r.height,
            }));

            const items = await strategy.extractItems({
              sourceId,
              regions,
            });

            const boundingRectangle = this.computeBoundingRectangle(group.regions);
            return { rectangle: boundingRectangle, items };
          },
        });
      });
    }),
  });

  readonly allSelectedRectangles = () => {
    return this.regionGroups().flatMap((group, groupIndex) =>
      group.regions.map((region, regionIndex) => ({
        ...region,
        groupIndex,
        isFirstInGroup: regionIndex === 0,
        isGrouped: group.regions.length > 1,
      }))
    );
  };

  private regionGroupsEqual(a: RegionGroup, b: RegionGroup): boolean {
    if (a.regions.length !== b.regions.length) return false;
    return a.regions.every((regionA, index) => {
      const regionB = b.regions[index];
      return regionA.x === regionB.x &&
             regionA.y === regionB.y &&
             regionA.width === regionB.width &&
             regionA.height === regionB.height &&
             regionA.pageNumber === regionB.pageNumber;
    });
  }

  private computeBoundingRectangle(regions: (SelectedRectangle & { pageNumber: number })[]): SelectedRectangle {
    if (regions.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    const minX = Math.min(...regions.map(r => r.x));
    const minY = Math.min(...regions.map(r => r.y));
    const maxX = Math.max(...regions.map(r => r.x + r.width));
    const maxY = Math.max(...regions.map(r => r.y + r.height));
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

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
      this.clearSelection();
    }
  }

  setSource(sourceId: string, pageNumber: number) {
    this.selectedSource.set({ sourceId, pageNumber });
  }

  addSelectedRectangle(rectangle: SelectedRectangle, addToGroup: boolean = false) {
    const selectedSource = this.selectedSource();
    if (!selectedSource) return;

    const regionWithPage = { ...rectangle, pageNumber: selectedSource.pageNumber };

    this.regionGroups.update((groups) => {
      const allRegions = groups.flatMap(g => g.regions);
      const hasOverlap = allRegions.some(existing =>
        existing.pageNumber === regionWithPage.pageNumber &&
        this.rectanglesOverlap(existing, regionWithPage)
      );

      if (hasOverlap) {
        return groups;
      }

      if (addToGroup && groups.length > 0) {
        const lastGroupIndex = groups.length - 1;
        return groups.map((group, index) =>
          index === lastGroupIndex
            ? { regions: [...group.regions, regionWithPage] }
            : group
        );
      }

      return [...groups, { regions: [regionWithPage] }];
    });
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
    this.regionGroups.set([]);
  }
}
