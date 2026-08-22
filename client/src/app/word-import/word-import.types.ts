export type WordImportWord = {
  lemma: string;
  wordType?: string;
  article?: string;
  occurrenceCount: number;
  examples: string[];
};

export type WordImportCandidate = {
  id: number;
  lemma: string;
  wordType?: string;
  article?: string;
  occurrenceCount: number;
  examples: string[];
};

export type WordImportStats = {
  pendingCount: number;
  knownCount: number;
  cardCount: number;
};

export type WordImportQueue = {
  candidates: WordImportCandidate[];
  stats: WordImportStats;
};

export type WordImportStageResult = {
  totalWords: number;
  stagedCount: number;
  alreadyKnownCount: number;
  existingCardCount: number;
  duplicateCount: number;
  stats: WordImportStats;
};

export type WordImportDecision = 'known' | 'card';
