import { HttpClient } from '@angular/common/http';
import { Injectable, inject, resource } from '@angular/core';
import { fetchJson } from './utils/fetchJson';

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private readonly http = inject(HttpClient);
  profile = resource<{ name: string; initials: string } | undefined, {}>({
    loader: async () => {
      const { displayName } = await fetchJson<{ displayName: string }>(
        this.http,
        'https://graph.microsoft.com/v1.0/me'
      );
      return {
        name: displayName,
        initials: this.getInitials(displayName),
      };
    },
  });

  private getInitials(name: string | undefined): string {
    if (!name) return '';
    const initials = name
      .split(' ')
      .map((n) => n[0])
      .join('');
    return initials.toUpperCase();
  }
}
