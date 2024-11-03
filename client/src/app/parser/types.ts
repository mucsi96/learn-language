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
  word: Word;
};

export type Word = {
  word: string;
  forms: string[];
  examples: string[];
};

export type Page = {
  spans: Span[];
  sourceName: string;
};

export type Source = {
  id: string;
  name: string;
  startPage: number;
};
