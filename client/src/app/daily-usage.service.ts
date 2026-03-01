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

  readonly imageDailyLimit = this.environmentConfig.imageDailyLimit;

  readonly audioDailyLimit = this.environmentConfig.audioDailyLimit;

  readonly isImageLimitReached = computed(() => {
    const limit = this.imageDailyLimit;
    return limit > 0 && this.imageUsageToday() >= limit;
  });

  readonly isAudioLimitReached = computed(() => {
    const limit = this.audioDailyLimit;
    return limit > 0 && this.audioUsageToday() >= limit;
  });

  readonly imageLimitTooltip = computed(() => {
    if (!this.isImageLimitReached()) return '';
    return `Daily image limit reached (${this.imageUsageToday()}/${this.imageDailyLimit})`;
  });

  readonly audioLimitTooltip = computed(() => {
    if (!this.isAudioLimitReached()) return '';
    return `Daily audio limit reached (${this.audioUsageToday()}/${this.audioDailyLimit})`;
  });

  readonly imageRemainingToday = computed(() => {
    if (this.imageDailyLimit === 0) return Infinity;
    return Math.max(0, this.imageDailyLimit - this.imageUsageToday());
  });

  readonly audioRemainingToday = computed(() => {
    if (this.audioDailyLimit === 0) return Infinity;
    return Math.max(0, this.audioDailyLimit - this.audioUsageToday());
  });

  reload(): void {
    this.usage.reload();
  }
}
