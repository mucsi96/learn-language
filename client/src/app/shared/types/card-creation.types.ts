import { CardData } from '../../parser/types';

export type CardType = 'vocabulary';

export interface ExtractedItem {
  id: string;
  exists?: boolean;
}

export interface ExtractionRequest {
  sourceId: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractionRegion {
  rectangle: { x: number; y: number; width: number; height: number };
  items: ExtractedItem[];
}

export interface CardCreationRequest {
  item: ExtractedItem;
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

export interface CardCreationStrategy {
  cardType: CardType;
  extractItems(request: ExtractionRequest): Promise<ExtractedItem[]>;
  getItemLabel(item: ExtractedItem): string;
  filterItemsBySearchTerm(items: ExtractedItem[], searchTerm: string): ExtractedItem[];
  createCardData(request: CardCreationRequest, progressCallback: (progress: number, step: string) => void): Promise<CardCreationResult>;
}

export interface CardCreationProgress {
  itemLabel: string;
  cardType: CardType;
  status: 'pending' | 'word-type' | 'translating' | 'generating-images' | 'creating-card' | 'completed' | 'error';
  progress: number;
  error?: string;
  currentStep?: string;
}

export interface BulkCardCreationResult {
  totalCards: number;
  successfulCards: number;
  failedCards: number;
  errors: string[];
}
