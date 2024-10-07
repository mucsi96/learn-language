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
}

export type Page = {
  spans: Span[];
  columns: Column[];
};
