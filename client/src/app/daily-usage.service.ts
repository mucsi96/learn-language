import { Injectable, inject, resource, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ENVIRONMENT_CONFIG } from './environment/environment.config';
import { fetchJson } from './utils/fetchJson';

interface DailyUsageResponse {
  imageUsageToday: number;
  audioUsageToday: number;
}

@Injectable({ providedIn: 'root' })
export class DailyUsageService {
  private readonly http = inject(HttpClient);
  private readonly environmentConfig = inject(ENVIRONMENT_CONFIG);

  readonly usage = resource<DailyUsageResponse, unknown>({
    loader: async () =>
      fetchJson<DailyUsageResponse>(
        this.http,
        '/api/model-usage-logs/daily-usage'
      ),
  });

  readonly imageUsageToday = computed(
    () => this.usage.value()?.imageUsageToday ?? 0
  );

  readonly audioUsageToday = computed(
    () => this.usage.value()?.audioUsageToday ?? 0
  );

  readonly imageDailyLimit = computed(
    () => this.environmentConfig.imageDailyLimit
  );

  readonly audioDailyLimit = computed(
    () => this.environmentConfig.audioDailyLimit
  );

  readonly isImageLimitReached = computed(() => {
    const limit = this.imageDailyLimit();
    return limit > 0 && this.imageUsageToday() >= limit;
  });

  readonly isAudioLimitReached = computed(() => {
    const limit = this.audioDailyLimit();
    return limit > 0 && this.audioUsageToday() >= limit;
  });

  wouldImageLimitBeExceeded(additionalImages: number): boolean {
    const limit = this.imageDailyLimit();
    if (limit === 0) return false;
    return this.imageUsageToday() + additionalImages > limit;
  }

  wouldAudioLimitBeExceeded(additionalAudio: number): boolean {
    const limit = this.audioDailyLimit();
    if (limit === 0) return false;
    return this.audioUsageToday() + additionalAudio > limit;
  }

  readonly imageRemainingToday = computed(() => {
    const limit = this.imageDailyLimit();
    if (limit === 0) return Infinity;
    return Math.max(0, limit - this.imageUsageToday());
  });

  readonly audioRemainingToday = computed(() => {
    const limit = this.audioDailyLimit();
    if (limit === 0) return Infinity;
    return Math.max(0, limit - this.audioUsageToday());
  });

  reload(): void {
    this.usage.reload();
  }
}
