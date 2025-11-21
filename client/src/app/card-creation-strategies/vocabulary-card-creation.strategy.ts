import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CardData } from '../parser/types';
import { fetchJson } from '../utils/fetchJson';
import { languages } from '../shared/constants/languages';
import { 
  CardCreationStrategy, 
  CardCreationRequest, 
  CardType 
} from '../shared/types/card-creation.types';
import { 
  ImageGenerationModel, 
  ImageSourceRequest, 
  ImageResponse 
} from '../shared/types/image-generation.types';

@Injectable({
  providedIn: 'root',
})
export class VocabularyCardCreationStrategy implements CardCreationStrategy {
  readonly cardType: CardType = 'vocabulary';
  
  private readonly http = inject(HttpClient);

  async createCardData(
    request: CardCreationRequest, 
    progressCallback: (progress: number, step: string) => void
  ): Promise<CardData> {
    const { word } = request;

    try {
      // Step 1: Get word type (15% progress)
      progressCallback(15, 'Detecting word type...');
      const wordTypeResponse = await fetchJson<{ type: string }>(
        this.http,
        `/api/word-type`,
        {
          body: { word: word.word },
          method: 'POST',
        }
      );

      // Step 1.5: Get gender for nouns (20% progress)
      let gender: string | undefined;
      if (wordTypeResponse.type === 'NOUN') {
        progressCallback(20, 'Detecting gender...');
        const genderResponse = await fetchJson<{ gender: string }>(
          this.http,
          `/api/gender`,
          {
            body: { word: word.word },
            method: 'POST',
          }
        );
        gender = genderResponse.gender;
      }

      // Step 2: Get translations (40% progress)
      progressCallback(40, 'Translating to multiple languages...');
      const translationPromises = languages.map(async (languageCode) => {
        const translation = await fetchJson<{ translation: string; examples: string[] }>(
          this.http,
          `/api/translate/${languageCode}`,
          {
            body: word,
            method: 'POST',
          }
        );
        return { languageCode, translation };
      });

      const translations = await Promise.all(translationPromises);
      const translationMap = Object.fromEntries(
        translations.map(({ languageCode, translation }) => [
          languageCode,
          translation.translation
        ])
      );
      const exampleTranslations = Object.fromEntries(
        translations.map(({ languageCode, translation }) => [
          languageCode,
          translation.examples || []
        ])
      );

      // Step 3: Generate images for examples (60% progress)
      progressCallback(60, 'Generating example images...');
      const exampleImages = await Promise.all(
        word.examples.map(async (example, exampleIndex) => {
          // Use English translation for image generation
          const englishTranslation = exampleTranslations['en']?.[exampleIndex];
          if (!englishTranslation) {
            return [];
          }

          // Generate images with both models
          const [gptImageResponse, imagenImageResponse] = await Promise.all([
            fetchJson<ImageResponse>(
              this.http,
              `/api/image`,
              {
                body: {
                  input: englishTranslation,
                  model: 'gpt-image-1'
                },
                method: 'POST',
              }
            ),
            fetchJson<ImageResponse>(
              this.http,
              `/api/image`,
              {
                body: {
                  input: englishTranslation,
                  model: 'google-imagen-4-ultra'
                },
                method: 'POST',
              }
            )
          ]);

          return [
            { id: gptImageResponse.id },
            { id: imagenImageResponse.id }
          ];
        })
      );

      // Step 4: Prepare card data (80% progress)
      progressCallback(80, 'Preparing vocabulary card data...');

      return {
        cardType: 'vocabulary',
        word: word.word,
        type: wordTypeResponse.type,
        gender: gender,
        translation: translationMap,
        forms: word.forms,
        examples: word.examples.map((example, index) => ({
          ...Object.fromEntries([
            ['de', example],
            ...languages.map((languageCode) => [
              languageCode,
              exampleTranslations[languageCode]?.[index] || ''
            ])
          ]),
          isSelected: index === 0,
          images: exampleImages[index] || []
        }))
      };

    } catch (error) {
      throw new Error(`Failed to prepare vocabulary card data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}