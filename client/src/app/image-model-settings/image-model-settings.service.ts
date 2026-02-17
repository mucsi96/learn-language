import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';
import { ENVIRONMENT_CONFIG, ImageModel } from '../environment/environment.config';

export interface ImageModelSettingRequest {
  modelName: string;
  imageCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class ImageModelSettingsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ENVIRONMENT_CONFIG);

  private readonly _imageModels = signal<ImageModel[]>(this.config.imageModels);

  readonly imageModels = this._imageModels.asReadonly();

  async updateImageCount(modelId: string, imageCount: number): Promise<void> {
    const previousModels = this._imageModels();

    this._imageModels.update((models) =>
      models.map((m) => (m.id === modelId ? { ...m, imageCount } : m))
    );

    try {
      await fetchJson<ImageModel>(this.http, '/api/image-model-settings', {
        method: 'PUT',
        body: {
          modelName: modelId,
          imageCount,
        } satisfies ImageModelSettingRequest,
      });
    } catch (error) {
      this._imageModels.set(previousModels);
      throw error;
    }
  }
}
