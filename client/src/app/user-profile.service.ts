import { computed, inject, Injectable } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private readonly authService = inject(AuthService);

  readonly profile = computed(() => {
    const userData = this.authService.userData();
    const name = userData?.name as string | undefined;
    if (!name) return undefined;
    return { name, initials: this.getInitials(name) };
  });

  private getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }
}
