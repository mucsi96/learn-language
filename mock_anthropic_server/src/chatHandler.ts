import { ClaudeRequest } from './types';
import { WORD_LISTS, TRANSLATIONS, WORD_TYPES, GENDERS, SENTENCE_LISTS, GRAMMAR_SENTENCE_LISTS, SENTENCE_TRANSLATIONS } from './data';
import { messagesMatch, createClaudeResponse } from './utils';
import { imageRequestMatch } from './ocr';

export class ChatHandler {
  async handleWordListExtraction(request: ClaudeRequest): Promise<any | null> {
    if (
      await imageRequestMatch(
        request,
        'You task is to extract the wordlist data from provided page image.',
        'Here is the image of the page',
        ['Hören', 'Lied']
      )
    ) {
      return createClaudeResponse({
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
      return createClaudeResponse({
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
      return createClaudeResponse({
        wordList: WORD_LISTS['absender_adresse'],
      });
    }

    return null;
  }

  handleTranslation(request: ClaudeRequest): any | null {
    const systemContent = request.system || '';

    if (!systemContent) {
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
        return createClaudeResponse({
          translation: translation.translation,
          examples: translation.examples,
        });
      }
    }

    return null;
  }

  handleGenderDetection(request: ClaudeRequest): any | null {
    for (const noun of Object.keys(GENDERS)) {
      if (
        messagesMatch(
          request,
          'Your task is to determine the gender of the given German noun',
          `The noun is: ${noun}.`
        )
      ) {
        return createClaudeResponse({
          gender: GENDERS[noun],
        });
      }
    }

    return null;
  }

  handleWordType(request: ClaudeRequest): any | null {
    for (const word of Object.keys(WORD_TYPES)) {
      if (messagesMatch(request, 'ADJECTIVE', word)) {
        return createClaudeResponse({
          type: WORD_TYPES[word],
        });
      }
    }

    return null;
  }

  async handleSentenceExtraction(request: ClaudeRequest): Promise<any | null> {
    if (
      await imageRequestMatch(
        request,
        'extract German sentences from the provided page image',
        'Here is the image of the page',
        ['Hören', 'Lied']
      )
    ) {
      return createClaudeResponse({
        sentences: SENTENCE_LISTS['speech_sentences'],
      });
    }

    return null;
  }

  async handleGrammarExtraction(request: ClaudeRequest): Promise<any | null> {
    if (
      await imageRequestMatch(
        request,
        'extract German sentences from the provided page image that can be used for grammar practice',
        'Here is the image of the page',
        ['Paco', 'Frau Wachter']
      )
    ) {
      return createClaudeResponse({
        sentences: GRAMMAR_SENTENCE_LISTS['grammar_sentences'],
      });
    }

    return null;
  }

  handleSentenceTranslation(request: ClaudeRequest): any | null {
    const systemContent = request.system || '';

    if (!systemContent) {
      return null;
    }

    let targetLanguage: string | null = null;
    if (
      systemContent.includes('translate the given German sentence to Hungarian')
    ) {
      targetLanguage = 'hungarian';
    } else if (
      systemContent.includes('translate the given German sentence to English')
    ) {
      targetLanguage = 'english';
    }

    if (!targetLanguage) {
      return null;
    }

    const translations = SENTENCE_TRANSLATIONS[targetLanguage];
    const userMessage = request.messages?.[0]?.content;
    if (typeof userMessage === 'string') {
      for (const sentence of Object.keys(translations)) {
        if (userMessage.includes(sentence)) {
          return createClaudeResponse({
            translation: translations[sentence],
          });
        }
      }
    }

    return null;
  }

  async processRequest(request: ClaudeRequest): Promise<any> {
    if (!request.messages || !Array.isArray(request.messages)) {
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

    const sentenceExtractionResponse = await this.handleSentenceExtraction(request);
    if (sentenceExtractionResponse) return sentenceExtractionResponse;

    const grammarExtractionResponse = await this.handleGrammarExtraction(request);
    if (grammarExtractionResponse) return grammarExtractionResponse;

    const sentenceTranslationResponse = this.handleSentenceTranslation(request);
    if (sentenceTranslationResponse) return sentenceTranslationResponse;

    console.log('Received unprocessed request:', JSON.stringify(request, null, 2));

    return createClaudeResponse(
      'This is a mock response from the Anthropic Claude API.'
    );
  }
}
