import { Component, HostBinding, Input } from '@angular/core';
import { BBox } from '../types';

const scale = 3;

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
