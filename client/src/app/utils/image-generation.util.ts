import { HttpClient } from '@angular/common/http';
import { ExampleImage } from '../parser/types';
import { ImageResponse, ImageSourceRequest } from '../shared/types/image-generation.types';
import { fetchJson } from './fetchJson';
import { ToolPool } from './tool-pool';

export type ImageGenerationInput = {
  exampleIndex: number;
  englishTranslation: string;
};

export type ImagesByIndex = Map<number, ExampleImage[]>;

export const generateExampleImages = async (
  http: HttpClient,
  imageModels: ReadonlyArray<{ id: string; imageCount: number }>,
  inputs: ReadonlyArray<ImageGenerationInput>,
  imageTokenPool: ToolPool,
  onToolsRequested?: () => void
): Promise<ImagesByIndex> => {
  const activeModels = imageModels.filter((model) => model.imageCount > 0);
  if (inputs.length === 0 || activeModels.length === 0) {
    onToolsRequested?.();
    return new Map();
  }

  const subtasks = inputs.flatMap((input) =>
    activeModels.flatMap((model) =>
      Array.from({ length: model.imageCount }, () => ({
        input,
        model,
      }))
    )
  );

  const acquirePromises = subtasks.map(() => imageTokenPool.acquire());
  onToolsRequested?.();

  const results = await Promise.all(
    subtasks.map(async ({ input, model }, i) => {
      await acquirePromises[i];
      try {
        const response = await fetchJson<ImageResponse>(
          http,
          '/api/image',
          {
            body: {
              input: input.englishTranslation,
              model: model.id,
            } satisfies ImageSourceRequest,
            method: 'POST',
          }
        );
        return {
          exampleIndex: input.exampleIndex,
          image: { id: response.id, model: response.model } as ExampleImage,
        };
      } catch {
        return undefined;
      } finally {
        imageTokenPool.release();
      }
    })
  );

  return results
    .filter((result): result is NonNullable<typeof result> => result != null)
    .reduce<ImagesByIndex>(
      (acc, result) => {
        const existing = acc.get(result.exampleIndex) ?? [];
        return new Map([
          ...acc,
          [result.exampleIndex, [...existing, result.image]],
        ]);
      },
      new Map()
    );
};
