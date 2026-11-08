import { suggestionsSchema } from './api';

export function parseSuggestionsJson(text: string) {
  if (!text.trim()) return null;
  try {
    const value: unknown = JSON.parse(text);
    if (!Array.isArray(value)) return { success: false as const, error: 'Expected a JSON array of cards.' };
    if (!value.length) return { success: false as const, error: 'The array contains no cards.' };
    const result = suggestionsSchema.safeParse(value);
    if (result.success) return result;
    return { success: false as const, error: result.error.issues.map(issue => {
      const index = Number(issue.path[0]) + 1;
      const field = issue.path[1];
      if (field === undefined) return `Card ${index}: expected an object.`;
      return `Card ${index}: "${String(field)}" must be ${field === 'topic' || field === 'category' ? 'a string' : 'a non-empty string'}.`;
    }).join('\n') };
  } catch (error) {
    return { success: false as const, error: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}` };
  }
}
