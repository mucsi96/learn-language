export interface GeminiTextPart {
  text: string;
}

export interface GeminiImagePart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

export type GeminiPart = GeminiTextPart | GeminiImagePart;

export interface GeminiMessage {
  role: string;
  parts: GeminiPart[];
}

export interface GeminiRequest {
  contents: GeminiMessage[];
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
}
