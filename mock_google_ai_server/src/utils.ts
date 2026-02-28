import { GeminiRequest, GeminiPart, GeminiTextPart } from './types';

const isTextPart = (part: GeminiPart): part is GeminiTextPart => {
  return 'text' in part;
};

export const messagesMatch = (
  request: GeminiRequest,
  systemPromptIncludes: string,
  userMessageIncludes: string
): boolean => {
  const systemContent = request.systemInstruction?.parts?.[0]?.text || '';
  const userParts = request.contents?.[0]?.parts || [];
  const textPart = userParts.find(isTextPart);
  const userContent = textPart?.text || '';

  return (
    systemContent.includes(systemPromptIncludes) &&
    userContent.includes(userMessageIncludes)
  );
};

export const createGeminiResponse = (
  content: string | object,
  model: string = 'gemini-3.1-pro-preview'
) => {
  const messageContent =
    typeof content === 'object' ? JSON.stringify(content) : content;

  return {
    candidates: [
      {
        content: {
          parts: [
            {
              text: messageContent,
            },
          ],
          role: 'model',
        },
        finishReason: 'STOP',
        index: 0,
      },
    ],
    usageMetadata: {
      promptTokenCount: 10,
      candidatesTokenCount: 10,
      totalTokenCount: 20,
    },
    modelVersion: model,
  };
};
