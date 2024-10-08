import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  combineLatest,
  map,
  Observable,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';
import { Page } from '../types';
import { handleError } from '../../utils/handleError';

@Injectable({
  providedIn: 'root',
})
export class PageService {
  private readonly $sourceId = new BehaviorSubject(0);
  private readonly $pageIndex = new BehaviorSubject(8);
  private readonly $page: Observable<Page>;
  private readonly loading = signal(true);

  constructor(http: HttpClient) {
    this.$page = combineLatest([this.$sourceId, this.$pageIndex]).pipe(
      tap(() => this.loading.set(true)),
      switchMap(([sourceIndex, pageIndex]) =>
        http.get<Page>(`/api/source/${sourceIndex}/page/${pageIndex}`).pipe(
          handleError('Could load page'),
          tap(() => this.loading.set(false))
        )
      ),
      shareReplay(1)
    );
  }

  get page() {
    return this.$pageIndex.value;
  }

  get spans() {
    return toSignal(this.$page.pipe(map((page) => page.spans)));
  }

  get columns() {
    return toSignal(this.$page.pipe(map((page) => page.columns)));
  }

  get words() {
    return toSignal(this.$page.pipe(map((page) => page.words)));
  }

  changePage(page: number) {
    this.$pageIndex.next(page);
  }

  isLoading() {
    return this.loading;
  }
}
