import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PageService } from '../../page.service';
import { SpanComponent } from '../span/span.component';
import { SourcesService } from '../../sources.service';

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [
    SpanComponent,
    FormsModule,
    RouterLink,
  ],
  templateUrl: './page.component.html',
  styleUrl: './page.component.css',
})
export class PageComponent implements AfterViewInit, OnDestroy {
  private readonly sourcesService = inject(SourcesService);
  private readonly pageService = inject(PageService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly elRef = inject(ElementRef);
  readonly sources = this.sourcesService.sourcesSignal;
  readonly spans = this.pageService.spans;
  readonly selectedSourceId = signal('');
  readonly pageNumber = signal(1);
  readonly sourceId = this.pageService.sourceId;
  readonly sourceName = this.pageService.sourceName;
  readonly loading = this.pageService.loading;
  private resizeObserver: ResizeObserver | undefined;

  constructor() {
    this.route.params.subscribe((params) => {
      const pageNumber = parseInt(params['pageNumber']);
      this.pageNumber.set(pageNumber);
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
    this.router.navigate([
      '/sources',
      this.sourceId(),
      'page',
      this.pageNumber(),
    ]);
  }
}
