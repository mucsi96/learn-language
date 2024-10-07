import { Component, HostBinding, Input } from '@angular/core';
import { BBox } from '../types';

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
        text: this.text,
        exampleSentences: this.exampleSentences,
      },
      null,
      2
    );
  }
}
