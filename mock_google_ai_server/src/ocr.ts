import { writeFileSync } from 'fs';
import { createWorker } from 'tesseract.js';
import { GeminiRequest, GeminiPart, GeminiTextPart, GeminiImagePart } from './types';

const isTextPart = (part: GeminiPart): part is GeminiTextPart => {
  return 'text' in part;
};

const isImagePart = (part: GeminiPart): part is GeminiImagePart => {
  return 'inlineData' in part;
};

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
  request: GeminiRequest,
  systemPromptIncludes: string,
  imageTextIncludes: string,
  imageOCRIncludes: string[]
): Promise<boolean> => {
  const systemContent = request.systemInstruction?.parts?.[0]?.text || '';
  const userParts = request.contents?.[0]?.parts || [];

  const textPart = userParts.find(isTextPart);
  const textContent = textPart?.text || '';

  const imagePart = userParts.find(isImagePart);
  const base64Data = imagePart?.inlineData?.data || '';

  const extractedText = await extractTextFromBase64(base64Data);

  console.log('OCR text', {
    extractedText,
    imageOCRIncludes,
    condition: imageOCRIncludes.every((part) => extractedText?.includes(part)),
  });

  if (!extractedText) {
    return false;
  }

  return (
    systemContent.includes(systemPromptIncludes) &&
    textContent.includes(imageTextIncludes) &&
    imageOCRIncludes.every((part) => extractedText.includes(part))
  );
};
