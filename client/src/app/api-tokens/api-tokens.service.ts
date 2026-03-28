import { Injectable, inject, resource, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';
import { DataRefreshService } from '../data-refresh.service';

export interface ApiToken {
  id: number;
  name: string;
  createdAt: string;
}

export interface ApiTokenCreateResponse {
  id: number;
  name: string;
  token: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApiTokensService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  private readonly dataRefreshService = inject(DataRefreshService);

  readonly tokens = resource({
    injector: this.injector,
    params: () => ({ _refresh: this.dataRefreshService.refreshTrigger() }),
    loader: async () => fetchJson<ApiToken[]>(this.http, '/api/api-tokens'),
  });

  async createToken(name: string): Promise<ApiTokenCreateResponse> {
    const result = await fetchJson<ApiTokenCreateResponse>(
      this.http,
      '/api/api-tokens',
      {
        method: 'POST',
        body: { name },
      }
    );
    this.tokens.reload();
    return result;
  }

  async deleteToken(id: number): Promise<void> {
    await fetchJson(this.http, `/api/api-tokens/${id}`, {
      method: 'DELETE',
    });
    this.tokens.reload();
  }
}
