import { inject, Injectable, resource } from '@angular/core';
import { Source } from './parser/types';
import { fetchJson } from './utils/fetchJson';
import { HttpClient } from '@angular/common/http';
import { DataRefreshService } from './data-refresh.service';

@Injectable({
  providedIn: 'root',
})
export class SourcesService {
  private readonly http = inject(HttpClient);
  private readonly dataRefreshService = inject(DataRefreshService);
  readonly sources = resource({
    params: () => ({ _refresh: this.dataRefreshService.refreshTrigger() }),
    loader: async () => fetchJson<Source[]>(this.http, '/api/sources'),
  });

  refetchSources() {
    this.sources.reload();
  }

  async createSource(source: Partial<Source>): Promise<void> {
    await fetchJson(this.http, '/api/source', {
      method: 'post',
      body: source,
    });
    this.refetchSources();
  }

  async updateSource(sourceId: string, source: Partial<Source>): Promise<void> {
    await fetchJson(this.http, `/api/source/${sourceId}`, {
      method: 'put',
      body: source,
    });
    this.refetchSources();
  }

  async deleteSource(sourceId: string): Promise<void> {
    await fetchJson(this.http, `/api/source/${sourceId}`, {
      method: 'delete',
    });
    this.refetchSources();
  }
}
