import { computed, inject, Injectable, Injector, signal } from '@angular/core';
import { resource } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { fetchJson } from '../utils/fetchJson';
import { ImageModel } from '../environment/environment.config';

export interface ImageModelSettingRequest {
  modelName: string;
  imageCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class ImageModelSettingsService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);

  private readonly _refreshTrigger = signal(0);

  private readonly _imageModelsResource = resource({
    injector: this.injector,
    request: () => this._refreshTrigger(),
    loader: async () =>
      fetchJson<ImageModel[]>(this.http, '/api/image-model-settings'),
  });

  readonly imageModels = computed(() => this._imageModelsResource.value() ?? []);

  async updateImageCount(modelId: string, imageCount: number): Promise<void> {
    await fetchJson<ImageModel>(this.http, '/api/image-model-settings', {
      method: 'PUT',
      body: {
        modelName: modelId,
        imageCount,
      } satisfies ImageModelSettingRequest,
    });

    this._refreshTrigger.update((v) => v + 1);
  }
}
