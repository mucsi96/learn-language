import { GeminiRequest, GeminiPart, GeminiTextPart } from './types';
import {
  WORD_LISTS,
  TRANSLATIONS,
  WORD_TYPES,
  GENDERS,
  SENTENCE_LISTS,
  SENTENCE_TRANSLATIONS,
  GRAMMAR_SENTENCE_LISTS,
  DICTIONARY_LOOKUPS,
} from './data';
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
  private failHungarianTranslation = false;

  setFailHungarianTranslation(fail: boolean): void {
    this.failHungarianTranslation = fail;
  }

  reset(): void {
    this.failHungarianTranslation = false;
  }

  async handleWordListExtraction(request: GeminiRequest): Promise<any | null> {
    if (
      await imageRequestMatch(
        request,
        'You task is to extract the wordlist data from provided page image.',
        'Here is the image of the page',
        ['aber', 'abfahren', 'der Absender', 'die Adresse']
      )
    ) {
      return createGeminiResponse({
        wordList: WORD_LISTS['aber_absender_combined'],
      });
    }

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
    if (systemContent.includes('translate the given German word and examples to English')) {
      targetLanguage = 'english';
    } else if (systemContent.includes('translate the given German word and examples to Hungarian')) {
      targetLanguage = 'hungarian';
    } else if (systemContent.includes('translate the given German word and examples to Swiss German')) {
      targetLanguage = 'swiss-german';
    }

    if (!targetLanguage) {
      return null;
    }

    if (targetLanguage === 'hungarian' && this.failHungarianTranslation) {
      throw new Error('Hungarian translation service unavailable');
    }

    for (const word of Object.keys(TRANSLATIONS[targetLanguage])) {
      if (messagesMatch(request, 'translate the given German word and examples', word)) {
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
        messagesMatch(request, 'Your task is to determine the gender of the given German noun', `The noun is: ${noun}.`)
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

  async handleSentenceExtraction(request: GeminiRequest): Promise<any | null> {
    if (
      await imageRequestMatch(
        request,
        'extract German sentences from the provided page image',
        'Here is the image of the page',
        ['Hören', 'Lied']
      )
    ) {
      return createGeminiResponse({
        sentences: SENTENCE_LISTS['speech_sentences'],
      });
    }

    return null;
  }

  async handleGrammarExtraction(request: GeminiRequest): Promise<any | null> {
    if (
      await imageRequestMatch(
        request,
        'extract German sentences from the provided page image that can be used for grammar practice',
        'Here is the image of the page',
        ['Paco', 'Frau Wachter']
      )
    ) {
      return createGeminiResponse({
        sentences: GRAMMAR_SENTENCE_LISTS['grammar_sentences'],
      });
    }

    return null;
  }

  handleDictionaryLookup(request: GeminiRequest): any | null {
    const systemContent = request.systemInstruction?.parts?.[0]?.text || '';
    const userContent = getTextContent(request);

    if (!systemContent.includes('dictionary lookup')) {
      return null;
    }

    let targetLanguage: string | null = null;
    if (systemContent.includes('Hungarian')) {
      targetLanguage = 'hu';
    } else if (systemContent.includes('English')) {
      targetLanguage = 'en';
    }

    if (!targetLanguage || !DICTIONARY_LOOKUPS[targetLanguage]) {
      return null;
    }

    try {
      const parsed = JSON.parse(userContent);
      const highlightedWord = parsed.highlightedWord;

      if (highlightedWord && DICTIONARY_LOOKUPS[targetLanguage][highlightedWord]) {
        return createGeminiResponse(DICTIONARY_LOOKUPS[targetLanguage][highlightedWord]);
      }
    } catch {
      // Not valid JSON, try matching by word in content
      const lookups = DICTIONARY_LOOKUPS[targetLanguage];
      for (const word of Object.keys(lookups)) {
        if (userContent.includes(word)) {
          return createGeminiResponse(lookups[word]);
        }
      }
    }

    return null;
  }

  handleSentenceTranslation(request: GeminiRequest): any | null {
    const systemContent = request.systemInstruction?.parts?.[0]?.text || '';
    const userContent = getTextContent(request);

    if (!systemContent || !userContent) {
      return null;
    }

    let targetLanguage: string | null = null;
    if (systemContent.includes('translate the given German sentence to Hungarian')) {
      targetLanguage = 'hungarian';
    } else if (systemContent.includes('translate the given German sentence to English')) {
      targetLanguage = 'english';
    }

    if (!targetLanguage) {
      return null;
    }

    const translations = SENTENCE_TRANSLATIONS[targetLanguage];
    for (const sentence of Object.keys(translations)) {
      if (userContent.includes(sentence)) {
        return createGeminiResponse({
          translation: translations[sentence],
        });
      }
    }

    return null;
  }

  async processRequest(request: GeminiRequest): Promise<any> {
    if (!request.contents || !Array.isArray(request.contents)) {
      throw new Error('Invalid request format');
    }

    const dictionaryResponse = this.handleDictionaryLookup(request);
    if (dictionaryResponse) return dictionaryResponse;

    const wordListResponse = await this.handleWordListExtraction(request);
    if (wordListResponse) return wordListResponse;

    const translationResponse = this.handleTranslation(request);
    if (translationResponse) return translationResponse;

    const genderDetectionResponse = this.handleGenderDetection(request);
    if (genderDetectionResponse) return genderDetectionResponse;

    const wordTypeResponse = this.handleWordType(request);
    if (wordTypeResponse) return wordTypeResponse;

    const sentenceExtractionResponse = await this.handleSentenceExtraction(request);
    if (sentenceExtractionResponse) return sentenceExtractionResponse;

    const grammarExtractionResponse = await this.handleGrammarExtraction(request);
    if (grammarExtractionResponse) return grammarExtractionResponse;

    const sentenceTranslationResponse = this.handleSentenceTranslation(request);
    if (sentenceTranslationResponse) return sentenceTranslationResponse;

    console.log('Received unprocessed request:', JSON.stringify(request, null, 2));

    return createGeminiResponse('This is a mock response from the Google Gemini API.');
  }
}
