import { Injectable, inject, resource, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';

export interface SourceGroup {
  id: number;
  name: string;
}

export interface SourceGroupRequest {
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class SourceGroupsService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);

  readonly groups = resource<SourceGroup[], never>({
    injector: this.injector,
    loader: async () => {
      return await fetchJson<SourceGroup[]>(this.http, '/api/source-groups');
    },
  });

  async createGroup(request: SourceGroupRequest): Promise<SourceGroup> {
    const result = await fetchJson<SourceGroup>(this.http, '/api/source-groups', {
      method: 'POST',
      body: request,
    });
    this.groups.reload();
    return result;
  }

  async updateGroup(
    id: number,
    request: SourceGroupRequest
  ): Promise<SourceGroup> {
    const result = await fetchJson<SourceGroup>(
      this.http,
      `/api/source-groups/${id}`,
      {
        method: 'PUT',
        body: request,
      }
    );
    this.groups.reload();
    return result;
  }

  async deleteGroup(id: number): Promise<void> {
    await fetchJson(this.http, `/api/source-groups/${id}`, {
      method: 'DELETE',
    });
    this.groups.reload();
  }
}
