import { ChatMessage } from './types';

export const messagesMatch = (
  messages: ChatMessage[],
  systemPromptIncludes: string,
  userMessageIncludes: string
): boolean => {
  return (
    messages[0]?.content.includes(systemPromptIncludes) &&
    messages[1]?.content?.includes(userMessageIncludes)
  );
};

export const createAssistantResponse = (
  content: string | object,
  model: string = 'gpt-3.5-turbo',
  finishReason: string = 'stop'
) => {
  const messageContent =
    typeof content === 'object' ? JSON.stringify(content) : content;

  return {
    id: 'mock-id',
    object: 'chat.completion',
    created: Date.now(),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: messageContent,
        },
        finish_reason: finishReason,
      },
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 10,
      total_tokens: 20,
    },
  };
};
