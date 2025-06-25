import { Component, HostBinding, inject, input, ResourceRef } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BBox, WordList } from '../types';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AsyncPipe } from '@angular/common';
import { CompressQueryPipe } from '../../utils/compress-query.pipe';

@Component({
  selector: 'app-span',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    MatDialogModule,
    AsyncPipe,
    CompressQueryPipe,
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
  readonly selectionRegions = input<ResourceRef<WordList | undefined>[]>();
  readonly dialog = inject(MatDialog);

  get matches() {
    const selectionRegions = this.selectionRegions();
    if (!this.searchTerm() || !selectionRegions?.length) {
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

      const { x, y, width, height } = regionValue;
      return spanBBox.y >= y &&
        spanBBox.y <= y + height &&
        spanBBox.x >= x &&
        spanBBox.x <= x + width;
    });

    if (!matchingRegion) {
      return [];
    }

    return matchingRegion.value()?.words?.filter((word) =>
      word.word.toLowerCase().includes(this.searchTerm()!.toLowerCase())
    ) || [];
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

  get cardHrefPrefix() {
    return `/sources/${this.sourceId()}/page/${this.pageNumber()}/cards?cardData=`;
  }

  get ariaDescription() {
    return this.exists() ?  'Card exists' : 'Card does not exist';
  }
}
