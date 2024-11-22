import { Injectable, resource } from '@angular/core';
import { Source } from './parser/types';

@Injectable({
  providedIn: 'root',
})
export class SourcesService {
  readonly sources = resource<Source[], unknown>({
    loader: async () => {
      const response = await fetch('/api/sources');
      if (!response.ok) {
        throw new Error('Could not load sources');
      }
      return response.json();
    },
  });
}
