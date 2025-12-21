import { writeFileSync } from 'fs';
import { createWorker } from 'tesseract.js';
import { ChatMessage } from './types';


export const extractTextFromImageUrl = async (
  imageUrl: string
): Promise<string | null> => {
  if (!imageUrl || !imageUrl.startsWith('data:image/')) {
    return null;
  }

  const worker = await createWorker('deu');
  const imageBuffer = Buffer.from(imageUrl.split(',')[1], 'base64');
  writeFileSync('image.png', imageBuffer);
  const { data } = await worker.recognize(imageBuffer);
  await worker.terminate();
  return data.text;
};

export const imageMessagesMatch = async (
  messages: ChatMessage[],
  systemPromptIncludes: string,
  imageTextIncludes: string,
  imageOCRIncludes: string[]
): Promise<boolean> => {
  const imageUrl = messages[1]?.content[1]?.image_url?.url;
  const extractedText = await extractTextFromImageUrl(imageUrl);

  console.log('OCR text', {
    extractedText,
    imageOCRIncludes,
    condition: imageOCRIncludes.every((part) => extractedText?.includes(part)),
  });

  if (!extractedText) {
    return false;
  }

  return (
    messages[0]?.content.includes(systemPromptIncludes) &&
    messages[1]?.content[0]?.text?.includes(imageTextIncludes) &&
    imageOCRIncludes.every((part) => extractedText.includes(part))
  );
};
