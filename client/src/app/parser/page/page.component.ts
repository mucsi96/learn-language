import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageService } from '../../page.service';
import { ColumnComponent } from '../column/column.component';
import { SpanComponent } from '../span/span.component';
import { WordComponent } from '../word/word.component';

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [
    SpanComponent,
    ColumnComponent,
    WordComponent,
    FormsModule,
    RouterLink,
  ],
  templateUrl: './page.component.html',
  styleUrl: './page.component.css',
})
export class PageComponent implements AfterViewInit, OnDestroy {
  private readonly pageService = inject(PageService);
  private readonly route = inject(ActivatedRoute);
  private readonly elRef = inject(ElementRef);
  readonly spans = this.pageService.spans;
  readonly columns = this.pageService.columns;
  readonly words = this.pageService.words;
  readonly selectedSourceId = signal('');
  readonly page = signal(1);
  readonly sourceId = this.pageService.sourceId;
  readonly loading = this.pageService.loading;
  private resizeObserver: ResizeObserver | undefined;

  constructor() {
    this.route.params.subscribe((params) => {
      const pageNumber = parseInt(params['pageNumber']);
      this.page.set(pageNumber);
      this.pageService.setSource(params['sourceId'], pageNumber);
    });
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

  onPageChange() {
    this.pageService.setPage(this.page());
  }
}
