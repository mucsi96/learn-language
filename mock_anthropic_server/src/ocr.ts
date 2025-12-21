import { writeFileSync } from 'fs';
import { createWorker } from 'tesseract.js';
import { ClaudeRequest } from './types';

export const extractTextFromBase64 = async (
  base64Data: string
): Promise<string | null> => {
  if (!base64Data) {
    return null;
  }

  const worker = await createWorker('deu');
  const imageBuffer = Buffer.from(base64Data, 'base64');
  writeFileSync('image.png', imageBuffer);
  const { data } = await worker.recognize(imageBuffer);
  await worker.terminate();
  return data.text;
};

export const imageRequestMatch = async (
  request: ClaudeRequest,
  systemPromptIncludes: string,
  textIncludes: string,
  imageOCRIncludes: string[]
): Promise<boolean> => {
  const systemContent = request.system || '';
  const userMessage = request.messages.find(m => m.role === 'user');

  if (!userMessage) {
    return false;
  }

  let textContent = '';
  let imageData: string | null = null;

  if (typeof userMessage.content === 'string') {
    textContent = userMessage.content;
  } else if (Array.isArray(userMessage.content)) {
    for (const block of userMessage.content) {
      if (block.type === 'text') {
        textContent += block.text || '';
      } else if (block.type === 'image' && block.source?.data) {
        imageData = block.source.data;
      }
    }
  }

  const extractedText = await extractTextFromBase64(imageData || '');

  console.log('OCR text', {
    extractedText,
    condition: imageOCRIncludes.every((part) => extractedText?.includes(part)),
  });

  if (!extractedText) {
    return false;
  }

  return (
    systemContent.includes(systemPromptIncludes) &&
    textContent.includes(textIncludes) &&
    imageOCRIncludes.every((part) => extractedText.includes(part))
  );
};
