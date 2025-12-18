import { ClaudeRequest, ClaudeMessage, ClaudeContentBlock, ClaudeTextBlock } from './types';

const isTextBlock = (block: ClaudeContentBlock): block is ClaudeTextBlock => {
  return block.type === 'text';
};

export const getMessageContent = (message: ClaudeMessage): string => {
  if (typeof message.content === 'string') {
    return message.content;
  }
  return message.content
    .filter(isTextBlock)
    .map(block => block.text)
    .join(' ');
};

export const messagesMatch = (
  request: ClaudeRequest,
  systemPromptIncludes: string,
  userMessageIncludes: string
): boolean => {
  const systemContent = request.system || '';
  const userMessage = request.messages.find(m => m.role === 'user');
  const userContent = userMessage ? getMessageContent(userMessage) : '';

  return (
    systemContent.includes(systemPromptIncludes) &&
    userContent.includes(userMessageIncludes)
  );
};

export const createClaudeResponse = (
  content: string | object,
  model: string = 'claude-sonnet-4-5-20250929'
) => {
  const messageContent =
    typeof content === 'object' ? JSON.stringify(content) : content;

  return {
    id: `msg_${Date.now()}`,
    type: 'message',
    role: 'assistant',
    content: [
      {
        type: 'text',
        text: messageContent,
      },
    ],
    model,
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: 10,
      output_tokens: 10,
    },
  };
};
