import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, Observable } from 'rxjs';
import { Page } from '../types';

@Injectable({
  providedIn: 'root',
})
export class PageService {
  private readonly $page: Observable<Page>;

  constructor(http: HttpClient) {
    this.$page = http.get<Page>('/api/sources/0/page/15');
  }

  get spans() {
    return toSignal(this.$page.pipe(map((page) => page.spans)));
  }

  get columns() {
    return toSignal(this.$page.pipe(map((page) => page.columns)));
  }
}
