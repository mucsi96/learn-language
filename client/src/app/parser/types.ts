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
  searchTerm?: string;
};

export type Word = ExtractedItem & {
  word: string;
  forms: string[];
  examples: string[];
};

export type ExampleImage = {
  id: string;
  isFavorite?: boolean;
  model?: string;
};

export type Example = {
  de?: string;
  hu?: string;
  en?: string;
  ch?: string;
  isSelected?: boolean;
  images?: ExampleImage[];
};

export type CardData = {
  word?: string;
  type?: string;
  gender?: string;
  translation?: Record<string, string | undefined>;
  forms?: string[];
  examples?: Example[];
  audio?: AudioData[];
  audioVoice?: string;
};

export type Card = {
  id: string;
  source: {
    id: string;
    name?: string;
    startPage?: number;
    cardType?: CardType;
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
  sourceType?: SourceType;
  cardType?: CardType;
  formatType?: SourceFormatType;
  hasImage?: boolean;
  width: number;
  height: number;
};

export type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type CardType = 'vocabulary' | 'speech' | 'grammar';

export type ExtractedItem = {
  id: string;
  exists: boolean;
};

export type Sentence = ExtractedItem & {
  sentence: string;
};

export type GrammarSentence = ExtractedItem & {
  sentence: string;
};

export type GrammarSentenceList = {
  sentences: GrammarSentence[];
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SentenceList = {
  sentences: Sentence[];
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ExtractionRequest = {
  sourceId: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ExtractionRegion = {
  rectangle: { x: number; y: number; width: number; height: number };
  items: ExtractedItem[];
};

export type CardCreationRequest = {
  item: ExtractedItem;
  sourceId: string;
  pageNumber: number;
  cardType: CardType;
};

export type ImageGenerationInfo = {
  cardId: string;
  exampleIndex: number;
  englishTranslation: string;
};

export type CardCreationResult = {
  cardData: CardData;
  imageGenerationInfos: ImageGenerationInfo[];
};

export type AudioGenerationItem = {
  text: string;
  language: string;
};

export type ImagesByIndex = Map<number, ExampleImage[]>;

export type LanguageTexts = {
  language: string;
  texts: string[];
};

export type CardTypeStrategy = {
  cardType: CardType;
  extractItems(request: ExtractionRequest): Promise<ExtractedItem[]>;
  getItemLabel(item: ExtractedItem): string;
  filterItemsBySearchTerm(
    items: ExtractedItem[],
    searchTerm: string
  ): ExtractedItem[];
  createCardData(
    request: CardCreationRequest,
    progressCallback: (progress: number, step: string) => void
  ): Promise<CardCreationResult>;
  requiredAudioLanguages(): string[];
  getCardDisplayLabel(card: Card): string;
  getCardTypeLabel(card: Card): string;
  getCardAdditionalInfo(card: Card): string | undefined;
  getAudioItems(card: Card): AudioGenerationItem[];
  updateCardDataWithImages(cardData: CardData, images: ImagesByIndex): CardData;
  getLanguageTexts(card: Card): LanguageTexts[];
};

export type SourceFormatType =
  | 'wordListWithExamples'
  | 'wordListWithFormsAndExamples'
  | 'flowingText';
export type SourceType = 'pdf' | 'images';

export type Source = {
  id: string;
  name: string;
  sourceType?: SourceType;
  startPage: number;
  pageCount?: number;
  cardCount?: number;
  languageLevel?: LanguageLevel;
  cardType?: CardType;
  formatType?: SourceFormatType;
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

export type StudySession = {
  sessionId: string;
};

export type StudySessionCard = {
  card: Card;
  learningPartnerId: number | null;
  turnName: string;
  studyMode: 'SOLO' | 'WITH_PARTNER';
};
