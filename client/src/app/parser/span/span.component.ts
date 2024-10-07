import { Component, HostBinding, Input } from '@angular/core';
import { BBox } from '../types';

const scale = 3;

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
    return scale * (this.bbox?.y ?? 0) + 'px';
  }

  @HostBinding('style.left') get left() {
    return scale * (this.bbox?.x ?? 0) + 'px';
  }

  @HostBinding('style.width') get width() {
    return scale * (this.bbox?.width ?? 0) + 'px';
  }

  @HostBinding('style.height') get height() {
    return scale * (this.bbox?.height ?? 0) + 'px';
  }
}
