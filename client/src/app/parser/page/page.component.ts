import { Component, signal, Signal, WritableSignal } from '@angular/core';
import { PageService } from './page.service';
import { Column, Span, Word } from '../types';
import { SpanComponent } from '../span/span.component';
import { ColumnComponent } from '../column/column.component';
import { WordComponent } from '../word/word.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [SpanComponent, ColumnComponent, WordComponent, FormsModule],
  templateUrl: './page.component.html',
  styleUrl: './page.component.css',
})
export class PageComponent {
  spans: Signal<Span[] | undefined>;
  columns: Signal<Column[] | undefined>;
  words: Signal<Word[] | undefined>;
  page: WritableSignal<number>;
  loading: Signal<boolean>;

  constructor(private readonly pageService: PageService) {
    this.spans = this.pageService.spans;
    this.columns = this.pageService.columns;
    this.words = this.pageService.words;
    this.page = signal(this.pageService.page);
    this.loading = this.pageService.isLoading();
  }

  onBack() {
    this.page.set(this.page() - 1);
    this.pageService.changePage(this.page());
  }

  onForward() {
    this.page.set(this.page() + 1);
    this.pageService.changePage(this.page());
  }

  onPageChange() {
    this.pageService.changePage(this.page());
  }
}
