import { ClaudeRequest } from './types';
import { TRANSLATIONS, WORD_TYPES, GENDERS } from './data';
import { messagesMatch, createClaudeResponse } from './utils';

export class ChatHandler {
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

  processRequest(request: ClaudeRequest): any {
    if (!request.messages || !Array.isArray(request.messages)) {
      throw new Error('Invalid request format');
    }

    const translationResponse = this.handleTranslation(request);
    if (translationResponse) return translationResponse;

    const genderDetectionResponse = this.handleGenderDetection(request);
    if (genderDetectionResponse) return genderDetectionResponse;

    const wordTypeResponse = this.handleWordType(request);
    if (wordTypeResponse) return wordTypeResponse;

    console.log('Received unprocessed request:', JSON.stringify(request, null, 2));

    return createClaudeResponse(
      'This is a mock response from the Anthropic Claude API.'
    );
  }
}
