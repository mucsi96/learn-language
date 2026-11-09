import { Injectable, inject, resource, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';

export interface GrammarTopic {
  id: number;
  name: string;
}

export interface GrammarTopicRequest {
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class GrammarTopicsService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);

  readonly topics = resource<GrammarTopic[], never>({
    injector: this.injector,
    loader: async () => {
      return await fetchJson<GrammarTopic[]>(
        this.http,
        '/api/grammar-topics'
      );
    },
  });

  async createTopic(request: GrammarTopicRequest): Promise<GrammarTopic> {
    const result = await fetchJson<GrammarTopic>(
      this.http,
      '/api/grammar-topics',
      {
        method: 'POST',
        body: request,
      }
    );
    this.topics.reload();
    return result;
  }

  async updateTopic(
    id: number,
    request: GrammarTopicRequest
  ): Promise<GrammarTopic> {
    const result = await fetchJson<GrammarTopic>(
      this.http,
      `/api/grammar-topics/${id}`,
      {
        method: 'PUT',
        body: request,
      }
    );
    this.topics.reload();
    return result;
  }

  async deleteTopic(id: number): Promise<void> {
    await fetchJson(this.http, `/api/grammar-topics/${id}`, {
      method: 'DELETE',
    });
    this.topics.reload();
  }
}
