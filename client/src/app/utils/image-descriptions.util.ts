import { HttpClient } from '@angular/common/http';
import { ImageDescriptionsRequest, ImageDescriptionsResponse } from '../shared/types/image-generation.types';
import { fetchJson } from './fetchJson';

export const describeImageScenes = async (
  http: HttpClient,
  request: ImageDescriptionsRequest
): Promise<string[]> => {
  const { descriptions } = await fetchJson<ImageDescriptionsResponse>(
    http,
    '/api/image/descriptions',
    { method: 'POST', body: request }
  );
  if (descriptions.length !== request.count || descriptions.some((description) => !description.trim())) {
    throw new Error('Image description count must match the requested image count');
  }
  return descriptions;
};
