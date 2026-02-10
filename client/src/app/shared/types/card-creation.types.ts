import { CardType } from '../../parser/types';

export type CardCreationProgress = {
  itemLabel: string;
  cardType: CardType;
  status: 'pending' | 'translating' | 'generating-images' | 'creating-card' | 'completed' | 'error';
  progress: number;
  error?: string;
  currentStep?: string;
}
