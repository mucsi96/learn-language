import { Injectable, resource } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SourcesService {
  sources = resource({
    loader: async () => {
      const response = await fetch('/api/sources');
      return response.json();
    },
  });
}
