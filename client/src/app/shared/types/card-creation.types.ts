import { CardData, Word, WordList } from '../../parser/types';

export type CardType = 'vocabulary';

export interface ExtractionRequest {
  sourceId: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CardCreationRequest {
  word: Word;
  sourceId: string;
  pageNumber: number;
  cardType: CardType;
}

export interface ImageGenerationInfo {
  cardId: string;
  exampleIndex: number;
  englishTranslation: string;
}

export interface CardCreationResult {
  cardData: CardData;
  imageGenerationInfos: ImageGenerationInfo[];
}

export type ExtractionResult = WordList;

export interface CardCreationStrategy {
  cardType: CardType;
  extractItems(request: ExtractionRequest): Promise<ExtractionResult>;
  createCardData(request: CardCreationRequest, progressCallback: (progress: number, step: string) => void): Promise<CardCreationResult>;
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
