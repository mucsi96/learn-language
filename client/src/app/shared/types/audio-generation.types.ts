export type AudioGenerationModel = 'openai' | 'eleven_turbo_v2_5';

export interface AudioSourceRequest {
  input: string;
  voice: string;
  model?: AudioGenerationModel;
  language?: string;
  selected?: boolean;
}

export interface AudioResponse {
  id: string;
}

export interface AudioData {
  id: string;
  voice: string;
  model: AudioGenerationModel;
  language?: string;
  text?: string;
  selected?: boolean;
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
    { voice: 'TumdjBNWanlT3ysvclWh', model: 'eleven_turbo_v2_5' as AudioGenerationModel }, // Magyar Férfi - Hungarian Male
    { voice: 'xQ7QVYmweeFQQ6autam7', model: 'eleven_turbo_v2_5' as AudioGenerationModel }, // Balazs - Calm
    { voice: 'Dme3o25EiC1DfrBQd73f', model: 'eleven_turbo_v2_5' as AudioGenerationModel }, // Aggie
  ],
  [LANGUAGE_CODES.GERMAN]: [
    { voice: 'ghgFyr7gmpr57xyTgX9q', model: 'eleven_turbo_v2_5' as AudioGenerationModel }, // Emilia - Sweet German Soul
    { voice: 'Jvf6TAXwMUVTSR20U0f9', model: 'eleven_turbo_v2_5' as AudioGenerationModel }, // Klaus - English with German accent
    { voice: 'ZQFCSsF1tIcjtMZJ6VCA', model: 'eleven_turbo_v2_5' as AudioGenerationModel } // Louisa
  ]
} as const;
