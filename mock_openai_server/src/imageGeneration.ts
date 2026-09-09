import { ImageGenerationRequest, ImageGenerationResponse } from './types';

// Source: https://png-pixel.com
export const IMAGES = {
  yellow: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8/5/hPwMRgHFUIX0VAgAYyB3tBFoR2wAAAABJRU5ErkJggg==',
  red: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8AARIQB46hC+ioEAGX8E/cKr6qsAAAAAElFTkSuQmCC',
  blue: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYPj/n4EIwDiqkL4KAVIQE/f1/NxEAAAAAElFTkSuQmCC',
  green: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFElEQVR42mNk+A+ERADGUYX0VQgAXAYT9xTSUocAAAAASUVORK5CYII=',
};

type PromptConfig = {
  pattern: string;
  firstImage: string;
  secondImage: string;
};

const OUTPUT_TOKENS_BY_QUALITY = {
  low: 196,
  medium: 439,
  high: 1756,
  xhigh: 3122,
  max: 7024,
  auto: 1756,
} as const;

const SUPPORTED_IMAGE_MODELS = [
  'gpt-image-2',
  'gpt-image-2.5-sunburst',
  'gpt-image-2.5-flare',
] as const;

const PROMPT_CONFIGS: PromptConfig[] = [
  {
    pattern: 'Wir fahren um zwölf Uhr ab.',
    firstImage: IMAGES.yellow,
    secondImage: IMAGES.blue,
  },
  {
    pattern: 'Wann fährt der Zug ab?',
    firstImage: IMAGES.red,
    secondImage: IMAGES.green,
  },
];

export class ImageGenerationHandler {
  reset(): void {}

  generateImages(request: ImageGenerationRequest): ImageGenerationResponse {
    const { prompt, model, n = 1, quality = 'auto' } = request;
    const inputTokens = 20;
    const outputTokens = OUTPUT_TOKENS_BY_QUALITY[quality] * n;

    if (!SUPPORTED_IMAGE_MODELS.some(supportedModel => supportedModel === model)) {
      throw new Error(`Unsupported image model: ${model}`);
    }

    console.log('Received image generation request with prompt:', prompt, 'n:', n);

    const matchedConfig = PROMPT_CONFIGS.find(config => prompt.includes(config.pattern));
    const images = matchedConfig
      ? [matchedConfig.firstImage, matchedConfig.secondImage]
      : [IMAGES.yellow, IMAGES.blue];

    return {
      created: Date.now(),
      data: images.slice(0, n).map(b64_json => ({
        b64_json,
        revised_prompt: prompt,
        url: null,
      })),
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        input_tokens_details: {
          image_tokens: 0,
          text_tokens: inputTokens,
        },
        output_tokens_details: {
          image_tokens: outputTokens,
          text_tokens: 0,
        },
      },
    };
  }
}
