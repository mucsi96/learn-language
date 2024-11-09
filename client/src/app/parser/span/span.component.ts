import { Component, HostBinding, Input } from '@angular/core';
import { BBox, Word } from '../types';

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
  @Input() matches?: Word[];
  @Input() searchTerm?: string;

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
        matches: this.matches,
        searchTerm: this.searchTerm,
      },
      null,
      2
    );
  }
}
