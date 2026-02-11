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

const PROMPT_CONFIGS: PromptConfig[] = [
  {
    pattern: "We are departing at twelve o'clock.",
    firstImage: IMAGES.yellow,
    secondImage: IMAGES.blue,
  },
  {
    pattern: 'When does the train leave?',
    firstImage: IMAGES.red,
    secondImage: IMAGES.green,
  },
];

export class ImageGenerationHandler {
  private counters = new Map<string, number>();

  reset(): void {
    this.counters.clear();
  }

  generateImage(request: ImageGenerationRequest): ImageGenerationResponse {
    const { prompt, model, n = 1 } = request;

    console.log('Received image generation request with prompt:', prompt, 'n:', n);

    let b64_json = IMAGES.yellow;

    for (const promptConfig of PROMPT_CONFIGS) {
      if (prompt.includes(promptConfig.pattern)) {
        const counterKey = `${model}:${promptConfig.pattern}`;
        const count = (this.counters.get(counterKey) ?? 0) + 1;
        this.counters.set(counterKey, count);
        b64_json = count > 1 ? promptConfig.secondImage : promptConfig.firstImage;
        break;
      }
    }

    return {
      created: Date.now(),
      data: Array.from({ length: n }, () => ({
        b64_json,
        revised_prompt: prompt,
        url: null,
      })),
    };
  }
}
