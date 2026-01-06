import { GeminiRequest, GeminiPart, GeminiTextPart } from './types';
import { WORD_LISTS, TRANSLATIONS, WORD_TYPES, GENDERS } from './data';
import { messagesMatch, createGeminiResponse } from './utils';
import { imageRequestMatch } from './ocr';

const isTextPart = (part: GeminiPart): part is GeminiTextPart => {
  return 'text' in part;
};

const getTextContent = (request: GeminiRequest): string => {
  const userParts = request.contents?.[0]?.parts || [];
  const textPart = userParts.find(isTextPart);
  return textPart?.text || '';
};

export class ChatHandler {
  async handleWordListExtraction(request: GeminiRequest): Promise<any | null> {
    if (
      await imageRequestMatch(
        request,
        'You task is to extract the wordlist data from provided page image.',
        'Here is the image of the page',
        ['Hören', 'Lied']
      )
    ) {
      return createGeminiResponse({
        wordList: WORD_LISTS['hoeren_lied'],
      });
    }

    if (
      await imageRequestMatch(
        request,
        'You task is to extract the wordlist data from provided page image.',
        'Here is the image of the page',
        ['aber', 'abfahren']
      )
    ) {
      return createGeminiResponse({
        wordList: WORD_LISTS['aber_abfahren'],
      });
    }

    if (
      await imageRequestMatch(
        request,
        'You task is to extract the wordlist data from provided page image.',
        'Here is the image of the page',
        ['der Absender', 'die Adresse']
      )
    ) {
      return createGeminiResponse({
        wordList: WORD_LISTS['absender_adresse'],
      });
    }

    return null;
  }

  handleTranslation(request: GeminiRequest): any | null {
    const systemContent = request.systemInstruction?.parts?.[0]?.text || '';
    const userContent = getTextContent(request);

    if (!systemContent || !userContent) {
      return null;
    }

    let targetLanguage: string | null = null;
    if (
      systemContent.includes(
        'translate the given German word and examples to English'
      )
    ) {
      targetLanguage = 'english';
    } else if (
      systemContent.includes(
        'translate the given German word and examples to Hungarian'
      )
    ) {
      targetLanguage = 'hungarian';
    } else if (
      systemContent.includes(
        'translate the given German word and examples to Swiss German'
      )
    ) {
      targetLanguage = 'swiss-german';
    }

    if (!targetLanguage) {
      return null;
    }

    for (const word of Object.keys(TRANSLATIONS[targetLanguage])) {
      if (
        messagesMatch(
          request,
          'translate the given German word and examples',
          word
        )
      ) {
        const translation = TRANSLATIONS[targetLanguage][word];
        return createGeminiResponse({
          translation: translation.translation,
          examples: translation.examples,
        });
      }
    }

    return null;
  }

  handleGenderDetection(request: GeminiRequest): any | null {
    for (const noun of Object.keys(GENDERS)) {
      if (
        messagesMatch(
          request,
          'Your task is to determine the gender of the given German noun',
          `The noun is: ${noun}.`
        )
      ) {
        return createGeminiResponse({
          gender: GENDERS[noun],
        });
      }
    }

    return null;
  }

  handleWordType(request: GeminiRequest): any | null {
    for (const word of Object.keys(WORD_TYPES)) {
      if (messagesMatch(request, 'ADJECTIVE', word)) {
        return createGeminiResponse({
          type: WORD_TYPES[word],
        });
      }
    }

    return null;
  }

  async processRequest(request: GeminiRequest): Promise<any> {
    if (!request.contents || !Array.isArray(request.contents)) {
      throw new Error('Invalid request format');
    }

    const wordListResponse = await this.handleWordListExtraction(request);
    if (wordListResponse) return wordListResponse;

    const translationResponse = this.handleTranslation(request);
    if (translationResponse) return translationResponse;

    const genderDetectionResponse = this.handleGenderDetection(request);
    if (genderDetectionResponse) return genderDetectionResponse;

    const wordTypeResponse = this.handleWordType(request);
    if (wordTypeResponse) return wordTypeResponse;

    console.log('Received unprocessed request:', JSON.stringify(request, null, 2));

    return createGeminiResponse(
      'This is a mock response from the Google Gemini API.'
    );
  }
}
