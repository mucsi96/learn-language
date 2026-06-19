// Source: https://png-pixel.com - simple 10x10 pixel images
export const IMAGES: Record<string, string> = {
  yellow: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mP8/5/hPwMRgHFUIX0VAgAYyB3tBFoR2wAAAABJRU5ErkJggg==',
  red: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8AARIQB46hC+ioEAGX8E/cKr6qsAAAAAElFTkSuQmCC',
  blue: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYPj/n4EIwDiqkL4KAVIQE/f1/NxEAAAAAElFTkSuQmCC',
  green: 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFElEQVR42mNk+A+ERADGUYX0VQgAXAYT9xTSUocAAAAASUVORK5CYII=',
};

type PromptConfig = {
  pattern: string;
  color: string;
};

const PROMPT_CONFIGS: PromptConfig[] = [
  { pattern: 'Wir fahren um zwölf Uhr ab.', color: 'yellow' },
  { pattern: 'Wann fährt der Zug ab?', color: 'red' },
];

export class ImageGenerationHandler {
  reset(): void {}

  resolveColor(prompt: string): string {
    const matchedConfig = PROMPT_CONFIGS.find(config => prompt.includes(config.pattern));
    return matchedConfig ? matchedConfig.color : 'yellow';
  }
}
