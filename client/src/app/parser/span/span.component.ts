import { Component, HostBinding, Input } from '@angular/core';
import { BBox } from '../types';

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
  @HostBinding('class.excluded') @Input() excluded?: boolean;

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
        fontSize: this.fontSize,
        color: this.color,
        excluded: this.excluded,
      },
      null,
      2
    );
  }
}
