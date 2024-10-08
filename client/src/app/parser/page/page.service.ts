import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  combineLatest,
  map,
  Observable,
  shareReplay,
  switchMap,
} from 'rxjs';
import { Page } from '../types';

@Injectable({
  providedIn: 'root',
})
export class PageService {
  private readonly $sourceIndex = new BehaviorSubject(0);
  private readonly $pageIndex = new BehaviorSubject(8);
  private readonly $page: Observable<Page>;

  constructor(http: HttpClient) {
    this.$page = combineLatest([this.$sourceIndex, this.$pageIndex]).pipe(
      switchMap(([sourceIndex, pageIndex]) => {
        return http.get<Page>(`/api/source/${sourceIndex}/page/${pageIndex}`);
      }),
      shareReplay(1)
    );
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

  back() {
    this.$pageIndex.next(this.$pageIndex.value - 1);
  }

  forward() {
    this.$pageIndex.next(this.$pageIndex.value + 1);
  }
}
