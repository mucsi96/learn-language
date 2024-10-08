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
        text: this.text,
        exampleSentences: this.exampleSentences,
      },
      null,
      2
    );
  }
}
