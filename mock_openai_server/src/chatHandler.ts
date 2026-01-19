import {
  ChatMessage,
} from './types';
import { WORD_LISTS, TRANSLATIONS, WORD_TYPES, GENDERS, SENTENCE_LISTS, SENTENCE_TRANSLATIONS } from './data';
import { messagesMatch, createAssistantResponse } from './utils';
import { imageMessagesMatch, extractTextFromImageUrl } from './ocr';

export class ChatHandler {
  async handleWordListExtraction(messages: ChatMessage[]): Promise<any | null> {
    if (
      await imageMessagesMatch(
        messages,
        'You task is to extract the wordlist data from provided page image.',
        'Here is the image of the page',
        ['Hören', 'Lied']
      )
    ) {
      return createAssistantResponse({
        wordList: WORD_LISTS['hoeren_lied'],
      });
    }

    // Check for first word list (aber, abfahren)
    if (
      await imageMessagesMatch(
        messages,
        'You task is to extract the wordlist data from provided page image.',
        'Here is the image of the page',
        ['aber', 'abfahren']
      )
    ) {
      return createAssistantResponse({
        wordList: WORD_LISTS['aber_abfahren'],
      });
    }

    // Check for second word list (der Absender, die Adresse)
    if (
      await imageMessagesMatch(
        messages,
        'You task is to extract the wordlist data from provided page image.',
        'Here is the image of the page',
        ['der Absender', 'die Adresse']
      )
    ) {
      return createAssistantResponse({
        wordList: WORD_LISTS['absender_adresse'],
      });
    }

    return null;
  }

  async handleTranslation(messages: ChatMessage[]): Promise<any | null> {
    const systemMessage = messages[0]?.content;
    const userMessage = messages[1]?.content;

    if (!systemMessage || !userMessage) {
      return null;
    }

    // Extract the target language from system message
    let targetLanguage: string | null = null;
    if (
      systemMessage.includes(
        'translate the given German word and examples to English'
      )
    ) {
      targetLanguage = 'english';
    } else if (
      systemMessage.includes(
        'translate the given German word and examples to Hungarian'
      )
    ) {
      targetLanguage = 'hungarian';
    } else if (
      systemMessage.includes(
        'translate the given German word and examples to Swiss German'
      )
    ) {
      targetLanguage = 'swiss-german';
    }

    if (!targetLanguage) {
      return null;
    }

    // Find which word is being translated
    for (const word of Object.keys(TRANSLATIONS[targetLanguage])) {
      if (
        messagesMatch(
          messages,
          'translate the given German word and examples',
          word
        )
      ) {
        const translation = TRANSLATIONS[targetLanguage][word];
        return createAssistantResponse({
          translation: translation.translation,
          examples: translation.examples,
        });
      }
    }

    return null;
  }

  handleGenderDetection(messages: ChatMessage[]): any | null {
    for (const noun of Object.keys(GENDERS)) {
      if (
        messagesMatch(
          messages,
          'Your task is to determine the gender of the given German noun',
          `The noun is: ${noun}.`
        )
      ) {
        return createAssistantResponse({
          gender: GENDERS[noun],
        });
      }
    }

    return null;
  }

  handleWordType(messages: ChatMessage[]): any | null {
    for (const word of Object.keys(WORD_TYPES)) {
      if (messagesMatch(messages, 'ADJECTIVE', word)) {
        return createAssistantResponse({
          type: WORD_TYPES[word],
        });
      }
    }

    return null;
  }

  async handleSentenceExtraction(messages: ChatMessage[]): Promise<any | null> {
    if (
      await imageMessagesMatch(
        messages,
        'extract German sentences from the provided page image',
        'Here is the image of the page',
        []
      )
    ) {
      return createAssistantResponse({
        sentences: SENTENCE_LISTS['speech_sentences'],
      });
    }

    return null;
  }

  handleSentenceTranslation(messages: ChatMessage[]): any | null {
    const systemMessage = messages[0]?.content;
    const userMessage = messages[1]?.content;

    if (!systemMessage || !userMessage) {
      return null;
    }

    let targetLanguage: string | null = null;
    if (
      systemMessage.includes('translate the given German sentence to Hungarian')
    ) {
      targetLanguage = 'hungarian';
    } else if (
      systemMessage.includes('translate the given German sentence to English')
    ) {
      targetLanguage = 'english';
    }

    if (!targetLanguage) {
      return null;
    }

    const translations = SENTENCE_TRANSLATIONS[targetLanguage];
    for (const sentence of Object.keys(translations)) {
      if (typeof userMessage === 'string' && userMessage.includes(sentence)) {
        return createAssistantResponse({
          translation: translations[sentence],
        });
      }
    }

    return null;
  }

  async handleOCRDebug(messages: ChatMessage[]): Promise<void> {
    if (messages[1]?.content[1]?.image_url?.url) {
      console.log(
        'OCR Result:',
        await extractTextFromImageUrl(messages[1].content[1].image_url.url)
      );
    }
  }

  async processMessages(messages: ChatMessage[]): Promise<any> {
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Invalid request format');
    }

    // Try word list extraction first
    const wordListResponse = await this.handleWordListExtraction(messages);
    if (wordListResponse) return wordListResponse;

    // Debug OCR if image is present
    await this.handleOCRDebug(messages);

    // Try translation
    const translationResponse = await this.handleTranslation(messages);
    if (translationResponse) return translationResponse;

    // Try gender detection
    const genderDetectionResponse = this.handleGenderDetection(messages);
    if (genderDetectionResponse) return genderDetectionResponse;

    // Try word type
    const wordTypeResponse = this.handleWordType(messages);
    if (wordTypeResponse) return wordTypeResponse;

    // Try sentence extraction
    const sentenceExtractionResponse = await this.handleSentenceExtraction(messages);
    if (sentenceExtractionResponse) return sentenceExtractionResponse;

    // Try sentence translation
    const sentenceTranslationResponse = this.handleSentenceTranslation(messages);
    if (sentenceTranslationResponse) return sentenceTranslationResponse;

    console.log('Received unprocessed messages:', messages);

    // Default response
    return createAssistantResponse(
      'This is a mock response from the OpenAI Chat API.'
    );
  }
}
