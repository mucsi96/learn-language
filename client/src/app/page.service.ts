import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  filter,
  map,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';
import { Page, WordList } from './parser/types';
import { handleError } from './utils/handleError';

@Injectable({
  providedIn: 'root',
})
export class PageService {
  readonly pageLoading = signal(true);
  readonly areaLoading = signal(false);
  private readonly http = inject(HttpClient);
  private $selectedSource = new BehaviorSubject<
    { sourceId: string; pageNumber: number } | undefined
  >(undefined);
  private $selectedRectange = new BehaviorSubject<
    { x: number; y: number; width: number; height: number } | undefined
  >(undefined);
  private readonly $page = this.$selectedSource.pipe(
    filter((source) => !!source),
    tap(() => this.pageLoading.set(true)),
    switchMap(({ sourceId, pageNumber }) =>
      this.http.get<Page>(`/api/source/${sourceId}/page/${pageNumber}`).pipe(
        handleError('Could load page'),
        tap(() => this.pageLoading.set(false))
      )
    ),
    shareReplay(1)
  );
  private readonly $words = this.$selectedRectange.pipe(
    filter(
      (rectangle) =>
        !!(
          rectangle?.x &&
          rectangle.y &&
          rectangle.width &&
          rectangle.height &&
          this.$selectedSource.value
        )
    ),
    tap(() => this.areaLoading.set(true)),
    switchMap((rectangle) => {
      const { sourceId, pageNumber } = this.$selectedSource.value!;
      const { x, y, width, height } = rectangle!;
      const url = `/api/source/${sourceId}/page/${pageNumber}/words?x=${x}&y=${y}&width=${width}&height=${height}`;
      return this.http.get<WordList>(url).pipe(
        handleError('Could not load word list'),
        tap(() => this.areaLoading.set(false))
      );
    }),
    shareReplay(1)
  );

  setPage(pageNumber: number) {
    if (!this.$selectedSource.value) {
      return;
    }

    if (this.$selectedSource.value.pageNumber !== pageNumber) {
      this.$selectedSource.next({
        sourceId: this.$selectedSource.value.sourceId,
        pageNumber,
      });
    }
  }

  setSource(sourceId: string, pageNumber: number) {
    this.$selectedSource.next({ sourceId, pageNumber });
  }

  setSelectedRectangle(rectangle: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) {
    this.$selectedRectange.next(rectangle);
  }

  get sourceId() {
    return toSignal(
      this.$selectedSource.pipe(map((source) => source?.sourceId))
    );
  }

  get sourceName() {
    return toSignal(this.$page.pipe(map((page) => page.sourceName)));
  }

  get spans() {
    return toSignal(this.$page.pipe(map((page) => page.spans)));
  }

  get height() {
    return toSignal(this.$page.pipe(map((page) => page.height)));
  }

  get words() {
    return toSignal(this.$words);
  }
}
