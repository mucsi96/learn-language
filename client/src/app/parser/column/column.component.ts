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
    return 100 * (this.bbox?.y ?? 0) + 'vw';
  }

  @HostBinding('style.left') get left() {
    return 100 * (this.bbox?.x ?? 0) + 'vw';
  }

  @HostBinding('style.width') get width() {
    return 100 * (this.bbox?.width ?? 0) + 'vw';
  }

  @HostBinding('style.height') get height() {
    return 100 * (this.bbox?.height ?? 0) + 'vw';
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
