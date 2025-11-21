import { CardState } from '../shared/state/card-state';
import { AudioData } from '../shared/types/audio-generation.types';

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
  audio?: AudioData[];
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
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: CardState;
  lastReview?: Date;
};

export type Page = {
  number: number;
  spans: Span[];
  sourceId: string;
  sourceName: string;
  width: number;
  height: number;
};

export type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type CardType = 'vocabulary';

export type Source = {
  id: string;
  name: string;
  fileName?: string;
  startPage: number;
  cardCount?: number;
  languageLevel?: LanguageLevel;
  cardType?: CardType;
};

export type WordList = {
  words: Word[];
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Region = {
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RegionGroup = {
  regions: Region[];
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
