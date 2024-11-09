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
  searchTerm?: string;
}

export type Word = {
  word: string;
  forms: string[];
  examples: string[];
};

export type Page = {
  spans: Span[];
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
