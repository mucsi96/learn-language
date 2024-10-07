import { Component, HostBinding, Input } from '@angular/core';
import { BBox } from '../types';

const scale = 3;

@Component({
  selector: 'app-word',
  standalone: true,
  imports: [],
  templateUrl: './word.component.html',
  styleUrl: './word.component.css',
})
export class WordComponent {
  @Input() bbox?: BBox;
  @Input() text?: string;
  @Input() exampleSentences?: string[];

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

  @HostBinding('title') get title() {
    return JSON.stringify(
      {
        text: this.text,
        exampleSentences: this.exampleSentences,
      },
      null,
      2
    );
  }
}
