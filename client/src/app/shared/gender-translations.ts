export interface GenderTranslation {
  gender: 'MASCULINE' | 'FEMININE' | 'NEUTER';
  color: string;
  translation: string;
}

export const GENDER_TRANSLATIONS: GenderTranslation[] = [
  { gender: 'MASCULINE', color: '#2196f3', translation: 'Masculine' },
  { gender: 'FEMININE', color: '#f44336', translation: 'Feminine' },
  { gender: 'NEUTER', color: '#4caf50', translation: 'Neuter' },
];

export function getGenderInfo(
  gender: string
): GenderTranslation | undefined {
  return GENDER_TRANSLATIONS.find((item) => item.gender === gender);
}
