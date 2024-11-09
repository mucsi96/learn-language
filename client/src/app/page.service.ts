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
import { Page } from './parser/types';
import { handleError } from './utils/handleError';

@Injectable({
  providedIn: 'root',
})
export class PageService {
  readonly loading = signal(true);
  private readonly http = inject(HttpClient);
  private $selectedSource = new BehaviorSubject<
    { sourceId: string; pageNumber: number } | undefined
  >(undefined);
  private readonly $page = this.$selectedSource.pipe(
    filter((source) => !!source),
    tap(() => this.loading.set(true)),
    switchMap(({ sourceId, pageNumber }) =>
      this.http.get<Page>(`/api/source/${sourceId}/page/${pageNumber}`).pipe(
        map((page) => ({
          ...page,
          height: Math.max(
            ...page.spans.map((span) => span.bbox.y + span.bbox.height)
          ),
        })),
        handleError('Could load page'),
        tap(() => this.loading.set(false))
      )
    ),
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
}
