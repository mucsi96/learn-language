// Pricing: https://platform.openai.com/docs/pricing
//          https://ai.google.dev/gemini-api/docs/pricing
export type ImageGenerationModel = 'gpt-image-1' | 'gpt-image-1.5' | 'google-imagen-4-ultra' | 'google-nano-banana-pro';

export interface ImageSourceRequest {
  input: string;
  model?: ImageGenerationModel;
}

export interface ImageResponse {
  id: string;
}
