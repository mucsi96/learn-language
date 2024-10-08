import { Component, HostBinding, Input } from '@angular/core';
import { BBox } from '../types';

@Component({
  selector: 'app-column',
  standalone: true,
  imports: [],
  templateUrl: './column.component.html',
  styleUrl: './column.component.css',
})
export class ColumnComponent {
  @Input() bbox?: BBox;
  @HostBinding('class') @Input() type?: 'word' | 'example_sentence';
  @Input() avgWordsPerSpan?: number;

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
        type: this.type,
        avgWordsPerSpan: this.avgWordsPerSpan,
      },
      null,
      2
    );
  }
}
