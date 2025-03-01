import { inject, Injectable, resource } from '@angular/core';
import { Source } from './parser/types';
import { fetchJson } from './utils/fetchJson';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class SourcesService {
  private readonly http = inject(HttpClient);
  readonly sources = resource<Source[], unknown>({
    loader: async () => {
      return fetchJson(this.http, '/api/sources');
    },
  });

  refetchSources() {
    this.sources.reload();
  }
}
