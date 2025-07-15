import { ChatMessage, TranslationResponse, WordTypeResponse, WordListResponse } from './types';
import { WORD_LISTS, TRANSLATIONS, WORD_TYPES } from './data';
import { messagesMatch, createAssistantResponse } from './utils';
import { imageMessagesMatch, extractTextFromImageUrl } from './ocr';

export class ChatHandler {
  async handleWordListExtraction(messages: ChatMessage[]): Promise<any | null> {
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
    if (systemMessage.includes('translate the given German word and examples to English')) {
      targetLanguage = 'english';
    } else if (systemMessage.includes('translate the given German word and examples to Hungarian')) {
      targetLanguage = 'hungarian';
    } else if (systemMessage.includes('translate the given German word and examples to Swiss German')) {
      targetLanguage = 'swiss-german';
    }

    if (!targetLanguage) {
      return null;
    }

    // Find which word is being translated
    for (const word of Object.keys(TRANSLATIONS[targetLanguage])) {
      if (messagesMatch(messages, 'translate the given German word and examples', word)) {
        const translation = TRANSLATIONS[targetLanguage][word];
        return createAssistantResponse({
          translation: translation.translation,
          examples: translation.examples,
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

    // Try word type determination
    const wordTypeResponse = this.handleWordType(messages);
    if (wordTypeResponse) return wordTypeResponse;

    console.log('Received unprocessed messages:', messages);

    // Default response
    return createAssistantResponse('This is a mock response from the OpenAI Chat API.');
  }
}
