import { inject, Injectable, Injector, signal } from '@angular/core';
import { resource } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ExampleImage } from '../parser/types';
import { fetchAsset } from '../utils/fetchAsset';
import { fetchJson } from '../utils/fetchJson';
import { ImageResponse, ImageSourceRequest } from './types/image-generation.types';
import { waitForImageReady } from '../utils/wait-for-image-ready';
import { GridImageResource, GridImageValue } from './image-grid/image-grid.component';
import { ImageModelSettingsService } from '../image-model-settings/image-model-settings.service';
import { RateLimitTokenService } from '../rate-limit-token.service';

type PendingImageResource = {
  gridResource: GridImageResource;
  resolve: (image: ExampleImage) => Promise<void>;
};

@Injectable({ providedIn: 'root' })
export class ImageResourceService {
  private readonly injector = inject(Injector);
  private readonly http = inject(HttpClient);
  private readonly imageModelSettingsService = inject(ImageModelSettingsService);
  private readonly rateLimitTokenService = inject(RateLimitTokenService);

  createResource(image: ExampleImage): GridImageResource {
    return resource({
      injector: this.injector,
      loader: async () => {
        const url = await this.fetchImageUrl(image.id);
        return { ...image, url };
      },
    });
  }

  generateImages(
    input: string,
    context?: string
  ): {
    placeholders: GridImageResource[];
    done: Promise<void>;
  } {
    const subtasks = this.imageModelSettingsService
      .imageModels()
      .filter((m) => m.imageCount > 0 || m.describedImageCount > 0)
      .flatMap((model) => [
        ...Array.from({ length: model.imageCount }, () => ({
          model,
          describe: false,
        })),
        ...Array.from({ length: model.describedImageCount }, () => ({
          model,
          describe: true,
        })),
      ]);

    const pending = subtasks.map(({ model }) =>
      this.createPendingResource(model.displayName)
    );

    const { imagePool } = this.rateLimitTokenService;
    const done = Promise.all(
      subtasks.map(({ model, describe }, idx) =>
        (async () => {
          await imagePool.acquire();
          try {
            const response = await fetchJson<ImageResponse>(
              this.http,
              `/api/image`,
              {
                body: {
                  input,
                  model: model.id,
                  describe,
                  ...(context ? { context } : {}),
                } satisfies ImageSourceRequest,
                method: 'POST',
              }
            );
            const { description } = await waitForImageReady(this.http, response.id);
            await pending[idx].resolve({
              id: response.id,
              model: response.model,
              description,
            });
          } finally {
            imagePool.release();
          }
        })()
      )
    ).then(() => undefined);

    return {
      placeholders: pending.map((p) => p.gridResource),
      done,
    };
  }

  toExampleImages(resources: GridImageResource[]): ExampleImage[] {
    return resources
      .map((r) => r.value())
      .filter(
        (v): v is GridImageValue & { id: string } => v != null && !!v.id
      )
      .map(
        (v) =>
          ({
            id: v.id,
            model: v.model,
            isFavorite: v.isFavorite,
            description: v.description,
          }) satisfies ExampleImage
      );
  }

  toggleFavorite(image: GridImageResource) {
    const imageValue = image.value();
    if (!imageValue) return;

    image.set({
      ...imageValue,
      isFavorite: !imageValue.isFavorite,
    });
  }

  private createPendingResource(modelDisplayName: string): PendingImageResource {
    const isLoading = signal(true);
    const value = signal<GridImageValue | undefined>({
      id: '',
      url: '',
      model: modelDisplayName,
    });

    const gridResource: GridImageResource = {
      isLoading: isLoading.asReadonly(),
      value: value.asReadonly(),
      set: (v: GridImageValue) => value.set(v),
    };

    const resolve = async (image: ExampleImage) => {
      const url = await this.fetchImageUrl(image.id);
      value.set({ ...image, url });
      isLoading.set(false);
    };

    return { gridResource, resolve };
  }

  private async fetchImageUrl(imageId: string) {
    return await fetchAsset(
      this.http,
      `/api/image/${imageId}`
    );
  }
}
