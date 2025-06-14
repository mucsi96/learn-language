import { Component, HostBinding, inject, input } from '@angular/core';
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
  readonly wordList = input<WordList>();
  readonly dialog = inject(MatDialog);

  get matches() {
    if (
      !this.searchTerm() ||
      (this.bbox()?.y ?? 0) < (this.wordList()?.y ?? 0) ||
      (this.bbox()?.y ?? 0) >
        (this.wordList()?.y ?? 0) + (this.wordList()?.height ?? 0) ||
      (this.bbox()?.x ?? 0) < (this.wordList()?.x ?? 0) ||
      (this.bbox()?.x ?? 0) >
        (this.wordList()?.x ?? 0) + (this.wordList()?.width ?? 0)
    ) {
      return [];
    }

    return this.wordList()?.words?.filter((word) =>
      word.word.toLowerCase().includes(this.searchTerm()!.toLowerCase())
    );
  }

  @HostBinding('style.top') get top() {
    return `calc(var(--page-width) * ${this.bbox()?.y ?? 0})`;
  }

  @HostBinding('style.left') get left() {
    return `calc(var(--page-width) * ${this.bbox()?.x ?? 0})`;
  }

  @HostBinding('style.width') get width() {
    return `calc(var(--page-width) * ${this.bbox()?.width ?? 0})`;
  }

  @HostBinding('style.height') get height() {
    return `calc(var(--page-width) * ${this.bbox()?.height ?? 0})`;
  }

  get cardHrefPrefix() {
    return `/sources/${this.sourceId()}/page/${this.pageNumber()}/cards?cardData=`;
  }

  get ariaDescription() {
    return this.exists() ?  'Card exists' : 'Card does not exist';
  }
}
