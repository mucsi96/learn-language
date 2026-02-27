import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';
import {
  ENVIRONMENT_CONFIG,
  ImageModel,
} from '../environment/environment.config';

export interface ImageModelSettingRequest {
  modelName: string;
  imageCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class ImageModelSettingsService {
  private readonly http = inject(HttpClient);
  private readonly environmentConfig = inject(ENVIRONMENT_CONFIG);
  readonly imageModels = signal(this.environmentConfig.imageModels);
  readonly imageRateLimitPerMinute = signal(this.environmentConfig.imageRateLimitPerMinute);

  updateImageCount(modelId: string, imageCount: number): void {
    this.imageModels.update((models) =>
      models.map((m) => (m.id === modelId ? { ...m, imageCount } : m))
    );

    fetchJson<ImageModel>(this.http, '/api/image-model-settings', {
      method: 'PUT',
      body: {
        modelName: modelId,
        imageCount,
      } satisfies ImageModelSettingRequest,
    });
  }

  updateImageRateLimit(value: number): void {
    this.imageRateLimitPerMinute.set(value);

    fetchJson<number>(this.http, '/api/rate-limit-settings/image-per-minute', {
      method: 'PUT',
      body: { value },
    });
  }
}
