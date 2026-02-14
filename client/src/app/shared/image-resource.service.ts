import { inject, Injectable, Injector, signal } from '@angular/core';
import { resource } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ExampleImage } from '../parser/types';
import { fetchAsset } from '../utils/fetchAsset';
import { fetchJson } from '../utils/fetchJson';
import { ENVIRONMENT_CONFIG } from '../environment/environment.config';
import { ImageSourceRequest } from './types/image-generation.types';
import { GridImageResource, GridImageValue } from './image-grid/image-grid.component';

type PendingImageResource = {
  gridResource: GridImageResource;
  resolve: (image: ExampleImage) => Promise<void>;
};

@Injectable({ providedIn: 'root' })
export class ImageResourceService {
  private readonly injector = inject(Injector);
  private readonly http = inject(HttpClient);
  private readonly environmentConfig = inject(ENVIRONMENT_CONFIG);

  createResource(image: ExampleImage): GridImageResource {
    return resource({
      injector: this.injector,
      loader: async () => {
        const url = await this.fetchImageUrl(image.id);
        return { ...image, url };
      },
    });
  }

  generateImages(englishTranslation: string): {
    placeholders: GridImageResource[];
    done: Promise<void>;
  } {
    const imageModels = this.environmentConfig.imageModels;

    const allPending = imageModels.flatMap((model) =>
      Array.from({ length: model.imageCount }, () =>
        this.createPendingResource(model.displayName)
      )
    );

    let placeholderOffset = 0;
    const done = Promise.all(
      imageModels.map(async (model) => {
        const startIdx = placeholderOffset;
        placeholderOffset += model.imageCount;

        const responses = await fetchJson<ExampleImage[]>(
          this.http,
          `/api/image`,
          {
            body: {
              input: englishTranslation,
              model: model.id,
            } satisfies ImageSourceRequest,
            method: 'POST',
          }
        );

        await Promise.all(
          responses.map((response, i) =>
            allPending[startIdx + i].resolve(response)
          )
        );
      })
    ).then(() => undefined);

    return {
      placeholders: allPending.map((p) => p.gridResource),
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
          }) satisfies ExampleImage
      );
  }

  toggleFavorite(image: GridImageResource) {
    const imageValue = image.value();
    if (!imageValue) return;

    (image as any).set({
      ...imageValue,
      isFavorite: !imageValue.isFavorite,
    });
  }

  private createPendingResource(modelDisplayName: string): PendingImageResource {
    const isLoading = signal(true);
    const value = signal<GridImageValue | undefined>({
      model: modelDisplayName,
    });

    const gridResource: GridImageResource = {
      isLoading: isLoading.asReadonly(),
      value: value.asReadonly(),
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
      `/api/image/${imageId}?width=600&height=600`
    );
  }
}
