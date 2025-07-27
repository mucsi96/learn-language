/**
 * Utilities for converting dates to/from ISO strings when working with Card objects
 */

import { Card } from '../parser/types';

/**
 * Converts date fields in a card to ISO strings for API requests
 * Ensures dates end with 'Z' to indicate UTC timezone
 */
export function mapCardDatesToISOStrings<T extends Partial<Card>>(card: T): T {
  const result = { ...card };

  // Convert date fields to ISO strings
  if (result.due && result.due instanceof Date) {
    result.due = ensureUTCTimezone(result.due.toISOString()) as any;
  }
  
  if (result.lastReview && result.lastReview instanceof Date) {
    result.lastReview = ensureUTCTimezone(result.lastReview.toISOString()) as any;
  }

  return result;
}

/**
 * Converts ISO string date fields back to Date objects for frontend use
 */
export function mapCardDatesFromISOStrings<T extends Partial<Card>>(card: T): T {
  const result = { ...card };

  // Convert ISO strings back to Date objects
  if (typeof result.due === 'string') {
    result.due = new Date(ensureUTCTimezone(result.due)) as any;
  }
  
  if (typeof result.lastReview === 'string') {
    result.lastReview = new Date(ensureUTCTimezone(result.lastReview)) as any;
  }

  return result;
}

/**
 * Ensures a date string ends with 'Z' to indicate UTC timezone
 */
function ensureUTCTimezone(dateString: string): string {
  return dateString.endsWith('Z') ? dateString : `${dateString}Z`;
}