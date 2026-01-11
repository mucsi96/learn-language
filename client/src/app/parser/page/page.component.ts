import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  linkedSignal,
  OnDestroy,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
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
import { MatChipsModule } from '@angular/material/chips';
import { ScrollPositionService } from '../../scroll-position.service';
import { BulkCardCreationFabComponent } from '../../bulk-card-creation-fab/bulk-card-creation-fab.component';
import { uploadDocument } from '../../utils/uploadDocument';
import { firstValueFrom } from 'rxjs';
import { CardCandidatesService } from '../../card-candidates.service';
import { KnownWordsService } from '../../known-words/known-words.service';

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
    MatChipsModule,
    BulkCardCreationFabComponent
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
  private readonly http = inject(HttpClient);
  readonly candidatesService = inject(CardCandidatesService);
  private readonly knownWordsService = inject(KnownWordsService);
  readonly sources = this.sourcesService.sources.value;
  readonly extractedCandidates = this.candidatesService.candidates;
  readonly pageNumber = linkedSignal(
    () => this.pageService.page.value()?.number
  );
  readonly selectedSourceId = computed(
    () => this.pageService.page.value()?.sourceId
  );
  readonly spans = computed(() => this.pageService.page.value()?.spans);
  readonly width = computed(() => this.pageService.page.value()?.width);
  readonly height = computed(() => this.pageService.page.value()?.height);
  readonly sourceType = computed(
    () => this.pageService.page.value()?.sourceType
  );
  readonly cardType = computed(
    () => this.pageService.page.value()?.cardType
  );
  readonly hasImage = computed(
    () => this.pageService.page.value()?.hasImage
  );
  readonly documentImage = this.pageService.documentImage;
  readonly selectionRegions = this.pageService.selectionRegions
  readonly sourceName = computed(
    () => this.pageService.page.value()?.sourceName
  );
  readonly pageLoading = this.pageService.page.isLoading;
  readonly selectionRegionsLoading = computed(() =>
    this.pageService.selectionRegions().some((w) => w.isLoading())
  );
  readonly isReady = computed(
    () => !this.pageLoading() && !this.selectionRegionsLoading() && !this.documentImage.isLoading()
  );
  readonly isEmptyImageSource = computed(() =>
    this.sourceType() === 'images' && !this.hasImage()
  );
  private resizeObserver: ResizeObserver | undefined;
  private readonly scrollPositionService = inject(ScrollPositionService);
  readonly uploading = signal(false);
  readonly uploadError = signal<string | null>(null);
  readonly isDragging = signal(false);

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
          `calc(${entry.contentRect.width}px / ${this.width()})`
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
    const height = this.height();

    if (!height) {
      return '0px';
    }

    return `calc(var(--page-width) * ${height})`;
  }

  onSelection(event: { x: number; y: number; width: number; height: number }) {
    const pageWidth = this.width();
    const parentRect = this.elRef.nativeElement.getBoundingClientRect();
    const parentWidth = parentRect.width;

    if (!pageWidth) {
      return;
    }

    const x = pageWidth * event.x / parentWidth;
    const y = pageWidth * event.y / parentWidth;
    const width = pageWidth * event.width / parentWidth;
    const height = pageWidth * event.height / parentWidth;
    this.pageService.addSelectedRectangle({ x, y, width, height });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleImageUpload(files[0]);
    }
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleImageUpload(input.files[0]);
    }
  }

  async handleImageUpload(file: File): Promise<void> {
    const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const fileName = file.name.toLowerCase();
    if (!validExtensions.some(ext => fileName.endsWith(ext))) {
      this.uploadError.set('Only image files (PNG, JPG, JPEG, GIF, WEBP) are allowed');
      return;
    }

    this.uploading.set(true);
    this.uploadError.set(null);

    try {
      const sourceId = this.selectedSourceId();
      if (!sourceId) return;

      await uploadDocument<{ fileName: string; pageNumber: number }>(
        this.http,
        `/api/source/${sourceId}/documents`,
        file
      );

      this.sourcesService.refetchSources();
      this.pageService.reload();
    } catch (error) {
      this.uploadError.set(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      this.uploading.set(false);
    }
  }

  async deleteImage(): Promise<void> {
    const sourceId = this.selectedSourceId();
    const pageNumber = this.pageNumber();
    if (!sourceId || !pageNumber) return;

    await firstValueFrom(
      this.http.delete(`/api/source/${sourceId}/documents/${pageNumber}`)
    );

    this.sourcesService.refetchSources();
    this.pageService.reload();
  }

  async addToKnownWords(itemLabel: string, itemId: string): Promise<void> {
    await this.knownWordsService.addWord(itemLabel);
    this.candidatesService.ignoreItem(itemId);
  }

  ignoreItem(itemId: string): void {
    this.candidatesService.ignoreItem(itemId);
  }
}
