import { HttpClient } from '@angular/common/http';
import { Injectable, inject, resource } from '@angular/core';
import { fetchJson } from './utils/fetchJson';
import { ConfigService } from './services/config.service';

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigService);

  profile = resource<{ name: string; initials: string } | undefined, {}>({
    loader: async () => {
      if (this.configService.getConfig().mockAuth) {
        return { name: 'Test User', initials: 'TU' };
      }

      try {
        const { displayName } = await fetchJson<{ displayName: string }>(
          this.http,
          'https://graph.microsoft.com/v1.0/me'
        );
        return {
          name: displayName,
          initials: this.getInitials(displayName),
        };
      } catch (error) {
        return;
      }
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
