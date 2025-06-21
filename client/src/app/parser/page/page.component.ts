import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  linkedSignal,
  OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PageService } from '../../page.service';
import { SpanComponent } from '../span/span.component';
import { SourcesService } from '../../sources.service';
import { DraggableSelectionDirective } from '../../draggable-selection.directive';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule, MatLabel } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ScrollPositionService } from '../../scroll-position.service';

@Component({
  selector: 'app-page',
  imports: [
    SpanComponent,
    FormsModule,
    RouterLink,
    DraggableSelectionDirective,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatLabel,
    MatInputModule,
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
  readonly sources = this.sourcesService.sources.value;
  readonly pageNumber = linkedSignal(
    () => this.pageService.page.value()?.number
  );
  readonly selectedSourceId = computed(
    () => this.pageService.page.value()?.sourceId
  );
  readonly spans = computed(() => this.pageService.page.value()?.spans);
  readonly height = computed(() => this.pageService.page.value()?.height);
  readonly selectionRegions = this.pageService.selectionRegions
  readonly sourceName = computed(
    () => this.pageService.page.value()?.sourceName
  );
  readonly pageLoading = this.pageService.page.isLoading;
  readonly selectionRegionsLoading = computed(() =>
    this.pageService.selectionRegions().some((w) => w.isLoading())
  );
  private resizeObserver: ResizeObserver | undefined;
  private readonly scrollPositionService = inject(ScrollPositionService);

  constructor() {
    this.route.params.subscribe((params) =>
      this.pageService.setSource(params['sourceId'], params['pageNumber'])
    );

    effect(() => {
      if (this.pageService.page.status() === 'resolved' && this.pageService.page.value()) {
        this.scrollPositionService.restoreScrollPosition();
      } else {
        this.scrollPositionService.detach();
      }
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
      this.selectedSourceId(),
      'page',
      this.pageNumber(),
    ]);
  }

  get heightStyle() {
    return `calc(var(--page-width) * ${this.height() ?? 0})`;
  }

  onSelection(event: { x: number; y: number; width: number; height: number }) {
    this.pageService.addSelectedRectangle(event);
  }
}
