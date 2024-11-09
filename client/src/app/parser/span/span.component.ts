import { Component, computed, HostBinding, Input } from '@angular/core';
import { BBox, Word, WordList } from '../types';

@Component({
  selector: 'app-span',
  standalone: true,
  imports: [],
  templateUrl: './span.component.html',
  styleUrl: './span.component.css',
})
export class SpanComponent {
  @Input() text?: string;
  @Input() font?: string;
  @Input() fontSize?: string;
  @Input() color?: string;
  @Input() bbox?: BBox;
  @Input() searchTerm?: string;
  @Input() wordList?: WordList;

  get matches() {
    if (
      !this.searchTerm ||
      (this.bbox?.y ?? 0) < (this.wordList?.y ?? 0) ||
      (this.bbox?.y ?? 0) >
        (this.wordList?.y ?? 0) + (this.wordList?.height ?? 0) ||
      (this.bbox?.x ?? 0) < (this.wordList?.x ?? 0) ||
      (this.bbox?.x ?? 0) >
        (this.wordList?.x ?? 0) + (this.wordList?.width ?? 0)
    ) {
      return [];
    }

    return this.wordList?.words?.filter((word) =>
      word.word.toLowerCase().includes(this.searchTerm!.toLowerCase())
    );
  }

  @HostBinding('style.top') get top() {
    return `calc(var(--page-width) * ${this.bbox?.y ?? 0})`;
  }

  @HostBinding('style.left') get left() {
    return `calc(var(--page-width) * ${this.bbox?.x ?? 0})`;
  }

  @HostBinding('style.width') get width() {
    return `calc(var(--page-width) * ${this.bbox?.width ?? 0})`;
  }

  @HostBinding('style.height') get height() {
    return `calc(var(--page-width) * ${this.bbox?.height ?? 0})`;
  }

  @HostBinding('title') get title() {
    return JSON.stringify(
      {
        font: this.font,
        bbox: this.bbox,
        fontSize: this.fontSize,
        color: this.color,
        searchTerm: this.searchTerm,
        matches: this.matches,
      },
      null,
      2
    );
  }
}
