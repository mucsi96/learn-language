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
  excluded: boolean;
};

export type Column = {
  bbox: BBox;
  type: 'word' | 'example_sentence';
  avgWordsPerSpan: number;
};

export type Word = {
  bbox: BBox;
  text: string;
  exampleSentences: string[];
};

export type Page = {
  spans: Span[];
  columns: Column[];
  words: Word[];
};

export type Source = {
  id: string;
  name: string;
  startPage: number;
};
