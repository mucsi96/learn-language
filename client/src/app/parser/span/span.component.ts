import { Component, HostBinding, inject, input, ResourceRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BBox } from '../types';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { ExtractionRegion, ExtractedItem } from '../../shared/types/card-creation.types';
import { CardCreationStrategyRegistry } from '../../card-creation-strategies/card-creation-strategy.registry';
import { PageService } from '../../page.service';

@Component({
  selector: 'app-span',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    RouterModule,
  ],
  templateUrl: './span.component.html',
  styleUrl: './span.component.css',
})
export class SpanComponent {
  readonly sourceId = input<string>();
  readonly pageNumber = input<number>();
  readonly text = input<string>();
  readonly font = input<string>();
  readonly fontSize = input<string>();
  readonly color = input<string>();
  readonly bbox = input<BBox>();
  readonly searchTerm = input<string>();
  readonly exists = input<boolean>();
  readonly selectionRegions = input<ResourceRef<ExtractionRegion | undefined>[]>();
  private readonly strategyRegistry = inject(CardCreationStrategyRegistry);
  private readonly pageService = inject(PageService);

  get matches() {
    const selectionRegions = this.selectionRegions();
    const searchTerm = this.searchTerm();
    if (!searchTerm || !selectionRegions?.length) {
      return [];
    }

    const spanBBox = this.bbox();
    if (!spanBBox) {
      return [];
    }

    const matchingRegion = selectionRegions.find(region => {
      const regionValue = region.value();
      if (!regionValue) {
        return false;
      }

      const { x, y, width, height } = regionValue.rectangle;
      return spanBBox.y >= y &&
        spanBBox.y <= y + height &&
        spanBBox.x >= x &&
        spanBBox.x <= x + width;
    });

    const items = matchingRegion?.value()?.items;
    if (!items) {
      return [];
    }

    const page = this.pageService.page.value();
    const strategy = this.strategyRegistry.getStrategy(page?.cardType);
    return strategy.filterItemsBySearchTerm(items, searchTerm);
  }

  @HostBinding('style.top') get top() {
    const  y = this.bbox()?.y;

    if (y == undefined) {
      return '0px';
    }

    return `calc(var(--page-width) * ${y})`;
  }

  @HostBinding('style.left') get left() {
    const x = this.bbox()?.x;

    if (x == undefined) {
      return '0px';
    }

    return `calc(var(--page-width) * ${x})`;
  }

  @HostBinding('style.width') get width() {
    const width = this.bbox()?.width;

    if (width == undefined) {
      return '0px';
    }

    return `calc(var(--page-width) * ${width})`;
  }

  @HostBinding('style.height') get height() {
    const height = this.bbox()?.height;
    if (height == undefined) {
      return '0px';
    }
    return `calc(var(--page-width) * ${height})`;
  }

  get ariaDescription() {
    return this.exists() ?  'Card exists' : 'Card does not exist';
  }

  getItemLabel(item: ExtractedItem): string {
    const page = this.pageService.page.value();
    const strategy = this.strategyRegistry.getStrategy(page?.cardType);
    return strategy.getItemLabel(item);
  }
}
