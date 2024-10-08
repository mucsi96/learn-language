import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  signal,
  Signal,
  WritableSignal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ColumnComponent } from '../column/column.component';
import { SpanComponent } from '../span/span.component';
import { Column, Span, Word } from '../types';
import { WordComponent } from '../word/word.component';
import { PageService } from './page.service';

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [SpanComponent, ColumnComponent, WordComponent, FormsModule],
  templateUrl: './page.component.html',
  styleUrl: './page.component.css',
})
export class PageComponent implements AfterViewInit, OnDestroy {
  spans: Signal<Span[] | undefined>;
  columns: Signal<Column[] | undefined>;
  words: Signal<Word[] | undefined>;
  page: WritableSignal<number>;
  loading: Signal<boolean>;
  resizeObserver: ResizeObserver | undefined;

  constructor(
    private readonly pageService: PageService,
    private readonly elRef: ElementRef
  ) {
    this.spans = this.pageService.spans;
    this.columns = this.pageService.columns;
    this.words = this.pageService.words;
    this.page = signal(this.pageService.page);
    this.loading = this.pageService.isLoading();
  }
  ngAfterViewInit(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        this.elRef.nativeElement.style.setProperty(
          '--page-width',
          `${entry.contentRect.width}px`
        );
      }
    });

    this.resizeObserver.observe(this.elRef.nativeElement.parentElement);
  }
  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
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
