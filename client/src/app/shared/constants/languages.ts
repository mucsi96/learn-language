export const languages = ['hu', 'ch', 'en'] as const;
export type Language = typeof languages[number];