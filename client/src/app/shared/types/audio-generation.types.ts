export enum AudioGenerationModel {
  OPENAI_TTS = 'openai',
  ELEVENLABS_TTS = 'elevenlabs'
}

export interface AudioSourceRequest {
  input: string;
  voice: string;
  model?: AudioGenerationModel;
  language?: string;
}

export interface AudioResponse {
  id: string;
}

// Eleven Labs Voice IDs
export const ELEVENLABS_VOICES = {
  RACHEL: '21m00Tcm4TlvDq8ikWAM',
  DOMI: 'AZnzlk1XvdvUeBnXmlld',
  BELLA: 'EXAVITQu4vr4xnSDxMaL',
  ANTONI: 'ErXwobaYiN019PkySvjV',
  ELLI: 'MF3mGyEYCl7XYWbV9V6O',
  JOSH: 'TxGEqnHWrfWFTfGW9XjX',
  ARNOLD: 'VR6AewLTigWG4xSOukaG',
  ADAM: 'pNInz6obpgDQGcFmaJgB'
} as const;

// OpenAI Voice Names
export const OPENAI_VOICES = {
  ALLOY: 'alloy',
  ASH: 'ash',
  BALLAD: 'ballad',
  CORAL: 'coral',
  ECHO: 'echo',
  FABLE: 'fable',
  ONYX: 'onyx',
  NOVA: 'nova',
  SAGE: 'sage',
  SHIMMER: 'shimmer',
  VERSE: 'verse'
} as const;

export type ElevenLabsVoiceId = typeof ELEVENLABS_VOICES[keyof typeof ELEVENLABS_VOICES];
export type OpenAIVoiceName = typeof OPENAI_VOICES[keyof typeof OPENAI_VOICES];

// Language codes (ISO 639-1)
export const LANGUAGE_CODES = {
  GERMAN: 'de',
  ENGLISH: 'en',
  HUNGARIAN: 'hu',
  SWISS_GERMAN: 'de-CH'
} as const;

export type LanguageCode = typeof LANGUAGE_CODES[keyof typeof LANGUAGE_CODES];
