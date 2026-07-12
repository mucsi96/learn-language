import { CardType } from '../parser/types';

export type CardTypeOption = { code: CardType; displayName: string };

export const CARD_TYPE_OPTIONS: CardTypeOption[] = [
  { code: 'vocabulary', displayName: 'Vocabulary' },
  { code: 'speech', displayName: 'Speech' },
  { code: 'grammar', displayName: 'Grammar' },
  { code: 'simple', displayName: 'Simple' },
];
