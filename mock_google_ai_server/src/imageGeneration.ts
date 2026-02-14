// Source: https://png-pixel.com - simple 10x10 pixel images
export const IMAGES = {
  yellow: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8/5/hPwMRgHFUIX0VAgAYyB3tBFoR2wAAAABJRU5ErkJggg==',
  red: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8AARIQB46hC+ioEAGX8E/cKr6qsAAAAAElFTkSuQmCC',
  blue: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYPj/n4EIwDiqkL4KAVIQE/f1/NxEAAAAAElFTkSuQmCC',
  green: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFElEQVR42mNk+A+ERADGUYX0VQgAXAYT9xTSUocAAAAASUVORK5CYII=',
};

type ImageModelConfig = {
  pattern: string;
  firstImage: string;
  secondImage: string;
};

const IMAGE_MODELS: ImageModelConfig[] = [
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
  reset(): void {}

  generateImages(prompt: string): string[] {
    const matchedConfig = IMAGE_MODELS.find(model => prompt.includes(model.pattern));
    return matchedConfig
      ? [matchedConfig.firstImage, matchedConfig.secondImage]
      : [IMAGES.yellow, IMAGES.blue];
  }
}
