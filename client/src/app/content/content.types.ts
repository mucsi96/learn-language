export interface SourceExtension {
  id: string;
  name: string;
  itemLabel: string;
  capabilities: string[];
}

export interface VocabularyWord {
  lemma: string;
  wordType: string;
  article: string;
  forms: string[];
  examples: string[];
  surfaceForms: string[];
}

export interface WordCoverage {
  key: string;
  word: VocabularyWord;
  status: 'missing' | 'not_ready' | 'unreviewed' | 'satisfied';
  cardIds: string[];
}

export interface ListeningProgress {
  position: number;
  duration: number;
  completed: boolean;
}

export interface ContentItem {
  id: string;
  metadata: {
    title: string;
    number: number | null;
    durationSeconds: number | null;
    languageLevel: string | null;
    transcriptUrl: string | null;
    matchError: string | null;
  };
  status: 'unprepared' | 'queued' | 'processing' | 'prepared' | 'failed';
  error: string | null;
  transcript: string | null;
  words: WordCoverage[];
  unlocked: boolean;
  progress: ListeningProgress | null;
}

export interface Playback {
  sessionId: string;
  kind: 'audio' | 'youtube';
  mediaUrl: string | null;
  youtubeVideoId: string | null;
  audioRevision: string;
  progress: ListeningProgress;
}

export interface PlaybackSnapshot extends ListeningProgress {
  paused: boolean;
}

export const formatPosition = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
