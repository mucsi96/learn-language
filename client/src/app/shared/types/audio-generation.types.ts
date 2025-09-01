export type AudioGenerationModel = 'openai' | 'eleven_turbo_v2_5';

export interface AudioSourceRequest {
  input: string;
  voice: string;
  model?: AudioGenerationModel;
  language?: string;
}

export interface AudioResponse {
  id: string;
}

export interface AudioMapEntry {
  id: string;
  voice: string;
  model: AudioGenerationModel;
}

export interface VoiceModelPair {
  voice: string;
  model: AudioGenerationModel;
}


// Language codes (ISO 639-1)
export const LANGUAGE_CODES = {
  GERMAN: 'de',
  ENGLISH: 'en',
  HUNGARIAN: 'hu',
  SWISS_GERMAN: 'de-CH'
} as const;

export type LanguageCode = typeof LANGUAGE_CODES[keyof typeof LANGUAGE_CODES];

export const LANGUAGE_SPECIFIC_VOICES = {
  [LANGUAGE_CODES.HUNGARIAN]: [
    { voice: 'M336tBVZHWWiWb4R54ui', model: 'eleven_turbo_v2_5' as AudioGenerationModel },
    { voice: 'WYg5oajoUHxVa6ikQXec', model: 'eleven_turbo_v2_5' as AudioGenerationModel }
  ],
  [LANGUAGE_CODES.GERMAN]: [
    { voice: 'ghgFyr7gmpr57xyTgX9q', model: 'eleven_turbo_v2_5' as AudioGenerationModel },
    { voice: 'Jvf6TAXwMUVTSR20U0f9', model: 'eleven_turbo_v2_5' as AudioGenerationModel }
  ]
} as const;
