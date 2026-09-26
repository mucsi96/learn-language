import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';
import { ContentItem, Playback } from './content.types';

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);

  list(sourceId: string): Promise<ContentItem[]> {
    return fetchJson(this.http, this.path(sourceId));
  }

  detail(sourceId: string, contentId: string): Promise<ContentItem> {
    return fetchJson(this.http, this.path(sourceId, contentId));
  }

  action(sourceId: string, contentId: string | undefined, action: string, body = {}): Promise<void> {
    return fetchJson(this.http, `${this.path(sourceId, contentId)}/${action}`, { method: 'post', body });
  }

  playback(sourceId: string, contentId: string): Promise<Playback> {
    return fetchJson(this.http, `${this.path(sourceId, contentId)}/playback`, { method: 'post' });
  }

  saveProgress(sourceId: string, contentId: string, body: ProgressWrite): Promise<void> {
    return fetchJson(this.http, `${this.path(sourceId, contentId)}/progress`, { method: 'put', body });
  }

  private path(sourceId: string, contentId?: string): string {
    return `/api/source/${encodeURIComponent(sourceId)}/content${contentId ? `/${encodeURIComponent(contentId)}` : ''}`;
  }
}

export interface ProgressWrite {
  sessionId: string;
  sequence: number;
  position: number;
  duration: number;
  completed: boolean;
}

export const contentError = (error: unknown): string =>
  error instanceof Error ? error.message : 'The operation failed. Please retry.';
