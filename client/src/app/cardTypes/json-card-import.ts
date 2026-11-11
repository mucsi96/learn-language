import { CardData, CardType } from '../parser/types';

export type JsonCardSuggestion = { id: string; type: CardType; data: CardData };

export interface JsonCardImport {
  example: Record<string, string>;
  validate(item: unknown, index: number): string[];
  toData(item: Record<string, string>): CardData;
}

export function defineJsonCardImport(
  example: Record<string, string>,
  required: readonly string[],
  toData: (item: Record<string, string>) => CardData
): JsonCardImport {
  return {
    example,
    toData,
    validate(item, index) {
      const prefix = `Card ${index + 1}:`;
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        return [`${prefix} expected an object.`];
      }
      const record = item as Record<string, unknown>;
      return [
        ...['id', ...required].filter(field =>
          typeof record[field] !== 'string' || !record[field].trim()
        ).map(field => `${prefix} "${field}" must be a non-empty string.`),
        ...Object.keys(example).filter(field =>
          field !== 'id' && !required.includes(field) &&
          record[field] !== undefined && typeof record[field] !== 'string'
        ).map(field => `${prefix} "${field}" must be a string.`),
        ...Object.keys(record).filter(field => !Object.hasOwn(example, field))
          .map(field => `${prefix} unexpected field "${field}".`),
      ];
    },
  };
}
