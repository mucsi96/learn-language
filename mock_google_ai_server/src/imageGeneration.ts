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
  private counters = new Map<string, number>();

  reset(): void {
    this.counters.clear();
  }

  generateImage(prompt: string) {
    for (const model of IMAGE_MODELS) {
      if (prompt.includes(model.pattern)) {
        const count = (this.counters.get(model.pattern) ?? 0) + 1;
        this.counters.set(model.pattern, count);
        return count > 1 ? model.secondImage : model.firstImage;
      }
    }
    return IMAGES.yellow;
  }
}
