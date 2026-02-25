export const CARD_READINESS_VALUES = ['READY', 'IN_REVIEW', 'REVIEWED', 'KNOWN', 'NEW'] as const;
export type CardReadiness = (typeof CARD_READINESS_VALUES)[number];
