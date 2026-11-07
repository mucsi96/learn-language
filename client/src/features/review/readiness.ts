import type { Card } from '../../api/cards';

export const grammarGaps = /\[([^\x5b\x5d]+)\]/g;
export function canReview(card: Pick<Card, 'type' | 'data'>): boolean {
  if (card.type === 'simple') return !!card.data.frontText?.trim() && !!card.data.backText?.trim();
  if (card.type === 'grammar') return Array.from((card.data.examples?.[0]?.de ?? '').matchAll(grammarGaps)).length > 0;
  const example =
    card.type === 'vocabulary' ? card.data.examples?.find((example) => example.isSelected) : card.data.examples?.[0];
  return example?.images?.some((image) => image.isFavorite) === true;
}
