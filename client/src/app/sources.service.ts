import { Injectable, resource } from '@angular/core';
import { Source } from './parser/types';
import { fetchJson } from './utils/fetchJson';

@Injectable({
  providedIn: 'root',
})
export class SourcesService {
  readonly sources = resource<Source[], unknown>({
    loader: async () => {
      return fetchJson('/api/sources');
    },
  });
}
