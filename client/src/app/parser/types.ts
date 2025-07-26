import { CardState } from '../shared/state/card-state';

export type Profile = {
  name: string;
  initials: string;
};

export type BBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Span = {
  text: string;
  font: string;
  fontSize: string;
  color: string;
  bbox: BBox;
  id?: string;
  searchTerm?: string;
  exists?: boolean;
};

export type Word = {
  id: string;
  word: string;
  forms: string[];
  examples: string[];
  exists?: boolean;
};

export type ExampleImage = {
  id: string;
  isFavorite?: boolean;
};

export type CardData = {
  word: string;
  type?: string;
  gender?: string;
  translation?: Record<string, string | undefined>;
  forms?: string[];
  examples?: (Record<string, string | undefined> & {
    isSelected?: boolean;
    images?: ExampleImage[];
  })[];
  audio?: Record<string, string>;
  audioVoice?: string;
};

export type Card = {
  id: string;
  source: {
    id: string;
    name?: string;
    startPage?: number;
  };
  sourcePageNumber: number;
  data: CardData;
  readiness: string;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: CardState;
  lastReview?: string;
};

export type Page = {
  number: number;
  spans: Span[];
  sourceId: string;
  sourceName: string;
  width: number;
  height: number;
};

export type Source = {
  id: string;
  name: string;
  startPage: number;
  cardCount?: number;
};

export type WordList = {
  words: Word[];
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Translation = {
  translation?: string;
  examples?: (string | undefined)[];
};

export type ImageSource = {
  id: string;
  input: string;
  index: number;
};
