// Pricing: https://platform.openai.com/docs/pricing
//          https://ai.google.dev/gemini-api/docs/pricing
export type ImageGenerationModel = 'gpt-image-1' | 'gpt-image-1.5' | 'imagen-4.0-ultra' | 'gemini-3-pro-image-preview';

export interface ImageSourceRequest {
  input: string;
  model?: ImageGenerationModel;
}

export interface ImageResponse {
  id: string;
}
