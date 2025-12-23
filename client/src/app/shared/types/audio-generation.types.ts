export type AudioGenerationModel = 'openai' | 'eleven_turbo_v2_5' | 'eleven_v3';

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
    { voice: 'TumdjBNWanlT3ysvclWh', model: 'eleven_turbo_v2_5' as AudioGenerationModel },
    { voice: 'xQ7QVYmweeFQQ6autam7', model: 'eleven_turbo_v2_5' as AudioGenerationModel },
    { voice: 'Dme3o25EiC1DfrBQd73f', model: 'eleven_turbo_v2_5' as AudioGenerationModel },
    { voice: 'BIvP0GN1cAtSRTxNHnWS', model: 'eleven_v3' as AudioGenerationModel },
  ],
  [LANGUAGE_CODES.GERMAN]: [
    { voice: 'ghgFyr7gmpr57xyTgX9q', model: 'eleven_turbo_v2_5' as AudioGenerationModel },
    { voice: 'Jvf6TAXwMUVTSR20U0f9', model: 'eleven_turbo_v2_5' as AudioGenerationModel },
    { voice: 'ZQFCSsF1tIcjtMZJ6VCA', model: 'eleven_turbo_v2_5' as AudioGenerationModel },
    { voice: 'BIvP0GN1cAtSRTxNHnWS', model: 'eleven_v3' as AudioGenerationModel },
  ]
} as const;
