import { Component, Signal } from '@angular/core';
import { PageService } from './page.service';
import { Column, Span, Word } from '../types';
import { SpanComponent } from '../span/span.component';
import { ColumnComponent } from '../column/column.component';
import { WordComponent } from '../word/word.component';

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [SpanComponent, ColumnComponent, WordComponent],
  templateUrl: './page.component.html',
  styleUrl: './page.component.css',
})
export class PageComponent {
  spans: Signal<Span[] | undefined>;
  columns: Signal<Column[] | undefined>;
  words: Signal<Word[] | undefined>;

  constructor(private readonly pageService: PageService) {
    this.spans = this.pageService.spans;
    this.columns = this.pageService.columns;
    this.words = this.pageService.words;
  }

  onBack() {
    this.pageService.back();
  }

  onForward() {
    this.pageService.forward();
  }
}
