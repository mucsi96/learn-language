export interface AudioSourceRequest {
  input: string;
  voice: string;
  model?: string;
  language?: string;
  selected?: boolean;
  context?: string;
  singleWord?: boolean;
}

export interface AudioResponse {
  id: string;
}

export interface AudioData {
  id: string;
  voice: string;
  model: string;
  language?: string;
  text?: string;
  selected?: boolean;
}

export interface VoiceModelPair {
  voice: string;
  model: string;
}


// Language codes (ISO 639-1)
export const LANGUAGE_CODES = {
  GERMAN: 'de',
  ENGLISH: 'en',
  HUNGARIAN: 'hu',
  SWISS_GERMAN: 'de-CH'
} as const;

export type LanguageCode = typeof LANGUAGE_CODES[keyof typeof LANGUAGE_CODES];
