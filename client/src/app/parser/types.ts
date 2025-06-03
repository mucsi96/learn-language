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

export type Card = {
  id: string;
  sourceId: string;
  pageNumber: number;
  word: string;
  type?: string;
  translation?: Record<string, string | undefined>;
  forms?: string[];
  examples?: (Record<string, string | undefined> & {
    isSelected?: boolean;
    imageUrls?: string[];
  })[];
};

export type Page = {
  number: number;
  spans: Span[];
  sourceId: string;
  sourceName: string;
  height: number;
};

export type Source = {
  id: string;
  name: string;
  startPage: number;
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
