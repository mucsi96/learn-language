export type ImageGenerationModel = 'gpt-image-1' | 'google-imagen-4-ultra';

export interface ImageSourceRequest {
  input: string;
  model?: ImageGenerationModel;
}

export interface ImageResponse {
  id: string;
}
