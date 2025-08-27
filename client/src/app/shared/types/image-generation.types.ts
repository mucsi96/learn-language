export enum ImageGenerationModel {
  GPT_IMAGE_1 = 'gpt-image-1',
  IMAGEN_4_ULTRA = 'google-imagen-4-ultra'
}

export interface ImageSourceRequest {
  input: string;
  model?: ImageGenerationModel;
}

export interface ImageResponse {
  id: string;
}
