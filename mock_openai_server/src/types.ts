export interface WordData {
  word: string;
  forms: string[];
  examples: string[];
}

export interface TranslationResponse {
  translation: string;
  examples: string[];
}

export interface GenderResponse {
  gender: string;
}

export interface WordTypeResponse {
  word: string;
  type: string;
}

export interface WordListResponse {
  wordList: WordData[];
}

export interface ChatMessage {
  role: string;
  content: string | any[];
}

export interface ImageGenerationRequest {
  prompt: string;
  model: string;
}

export interface ImageGenerationResponse {
  created: number;
  data: Array<{
    b64_json: string;
    revised_prompt: string;
    url: null;
  }>;
}

export interface AudioGenerationRequest {
  input: string;
}
