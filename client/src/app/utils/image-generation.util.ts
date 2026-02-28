import { HttpClient } from '@angular/common/http';
import { ExampleImage } from '../parser/types';
import { ImageResponse, ImageSourceRequest } from '../shared/types/image-generation.types';
import { fetchJson } from './fetchJson';
import { TokenPool } from './token-pool';

export type ImageGenerationInput = {
  exampleIndex: number;
  englishTranslation: string;
};

export type ImagesByIndex = Map<number, ExampleImage[]>;

export const generateExampleImages = async (
  http: HttpClient,
  imageModels: ReadonlyArray<{ id: string; imageCount: number }>,
  inputs: ReadonlyArray<ImageGenerationInput>,
  imageTokenPool: TokenPool
): Promise<ImagesByIndex> => {
  const activeModels = imageModels.filter((model) => model.imageCount > 0);
  if (inputs.length === 0 || activeModels.length === 0) {
    return new Map();
  }

  const results = await Promise.all(
    inputs.flatMap(input =>
      activeModels.map(async (model) => {
        await imageTokenPool.acquire();
        try {
          const responses = await fetchJson<ImageResponse[]>(
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
          return responses.map(response => ({
            exampleIndex: input.exampleIndex,
            image: { id: response.id, model: response.model } as ExampleImage,
          }));
        } catch {
          return [];
        } finally {
          imageTokenPool.release();
        }
      })
    )
  );

  return results.flat().reduce<ImagesByIndex>(
    (acc, result) => {
      const existing = acc.get(result.exampleIndex) ?? [];
      return new Map([...acc, [result.exampleIndex, [...existing, result.image]]]);
    },
    new Map()
  );
};
