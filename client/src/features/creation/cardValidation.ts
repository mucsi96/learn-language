import type { CardData } from '../../api/cards';
import type { CardType } from './api';

export const grammarGap = () => /\[([^\]]+)\]/g;
export function normalizeCardData(type: CardType, data: CardData): CardData {
  if (type === 'simple') return { ...data, topic: data.topic?.trim() || undefined, category: data.category?.trim() || undefined };
  if (type === 'grammar') return { ...data, hint: data.hint?.trim() || undefined };
  return data;
}
export function canReviewCard(type: CardType, data: CardData): boolean {
  if (type === 'simple') return Boolean(data.frontText?.trim() && data.backText?.trim());
  if (type === 'grammar') return grammarGap().test(data.examples?.[0]?.de ?? '');
  const example = type === 'vocabulary' ? data.examples?.find((value) => value.isSelected) : data.examples?.[0];
  return Boolean(example?.images?.some((image) => image.isFavorite));
}
