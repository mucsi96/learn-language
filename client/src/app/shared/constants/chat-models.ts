export const chatModels = ['gpt-4o', 'gpt-4.1', 'gpt-5', 'claude-sonnet-4-5', 'gemini-3-pro-preview'] as const;
export type ChatModel = typeof chatModels[number];
