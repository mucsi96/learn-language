
// Source: https://png-pixel.com - simple 10x10 pixel images
export const IMAGES = {
  yellow: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8/5/hPwMRgHFUIX0VAgAYyB3tBFoR2wAAAABJRU5ErkJggg==',
  red: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8AARIQB46hC+ioEAGX8E/cKr6qsAAAAAElFTkSuQmCC',
  blue: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYPj/n4EIwDiqkL4KAVIQE/f1/NxEAAAAAElFTkSuQmCC',
  green: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFElEQVR42mNk+A+ERADGUYX0VQgAXAYT9xTSUocAAAAASUVORK5CYII=',
};

export class ImageGenerationHandler {
  private imageCallCounter1 = 0;
  private imageCallCounter2 = 0;

  reset(): void {
    this.imageCallCounter1 = 0;
    this.imageCallCounter2 = 0;
  }

  generateImage(prompt: string) {
    let imageBytes = IMAGES.yellow;

    if (prompt.includes("We are departing at twelve o'clock.")) {
      this.imageCallCounter1++;
      imageBytes = this.imageCallCounter1 > 1 ? IMAGES.blue : IMAGES.yellow;
    }

    if (prompt.includes('When does the train leave?')) {
      this.imageCallCounter2++;
      imageBytes = this.imageCallCounter2 > 1 ? IMAGES.green : IMAGES.red;
    }

    return {
      predictions: [
        {
          mimeType: 'image/jpeg',
          bytesBase64Encoded: imageBytes
        }
      ]
    };
  }
}
