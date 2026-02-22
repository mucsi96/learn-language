import { Injectable, inject, resource, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';

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

  readonly tokens = resource<ApiToken[], never>({
    injector: this.injector,
    loader: async () => {
      return await fetchJson<ApiToken[]>(this.http, '/api/api-tokens');
    },
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
