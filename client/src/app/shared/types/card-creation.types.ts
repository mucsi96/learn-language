import { CardData, Word } from '../../parser/types';
import { ImageGenerationModel } from './image-generation.types';

export enum CardType {
  VOCABULARY = 'vocabulary',
  // Future card types can be added here
  // GRAMMAR = 'grammar',
  // PHRASE = 'phrase'
}

export interface CardCreationRequest {
  word: Word;
  sourceId: string;
  pageNumber: number;
  cardType: CardType;
  imageModel?: ImageGenerationModel;
}

export interface CardCreationStrategy {
  cardType: CardType;
  createCardData(request: CardCreationRequest, progressCallback: (progress: number, step: string) => void): Promise<CardData>;
}

export interface CardCreationProgress {
  word: string;
  cardType: CardType;
  status: 'pending' | 'word-type' | 'translating' | 'generating-images' | 'creating-card' | 'completed' | 'error';
  progress: number; // 0-100
  error?: string;
  currentStep?: string;
}

export interface BulkCardCreationResult {
  totalCards: number;
  successfulCards: number;
  failedCards: number;
  errors: string[];
}