export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: string; text: string }>;
}

export interface ClaudeRequest {
  model: string;
  max_tokens: number;
  system?: string;
  messages: ClaudeMessage[];
}
