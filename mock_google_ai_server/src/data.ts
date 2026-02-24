interface WordData {
  word: string;
  forms: string[];
  examples: string[];
}

export const WORD_LISTS: Record<string, WordData[]> = {
  aber_absender_combined: [
    {
      word: 'aber',
      forms: [],
      examples: ['Ab morgen muss ich arbeiten.'],
    },
    {
      word: 'abfahren',
      forms: ['fährt ab', 'fuhr ab', 'abgefahren'],
      examples: ['Wir fahren um zwölf Uhr ab.', 'Wann fährt der Zug ab?'],
    },
    {
      word: 'die Abfahrt',
      forms: ['die Abfahrten'],
      examples: ['Vor der Abfahrt rufe ich an.'],
    },
    {
      word: 'der Absender',
      forms: [],
      examples: ['Da ist ein Brief für dich ohne Absender.'],
    },
    {
      word: 'Achtung',
      forms: [],
      examples: ['Achtung! Das dürfen Sie nicht tun.'],
    },
    {
      word: 'die Adresse',
      forms: ['die Adressen'],
      examples: ['Können Sie mir seine Adresse sagen?'],
    },
  ],
  hoeren_lied: [
    {
      word: 'hören',
      forms: ['hört', 'hörte', 'gehört'],
      examples: ['Hören Sie. Wie heißt das Lied?'],
    },
    {
      word: 'das Lied',
      forms: ['die Lieder'],
      examples: ['Das Lied ist sehr schön.'],
    },
  ],
  aber_abfahren: [
    {
      word: 'aber',
      forms: [],
      examples: ['Ab morgen muss ich arbeiten.'],
    },
    {
      word: 'abfahren',
      forms: ['fährt ab', 'fuhr ab', 'abgefahren'],
      examples: ['Wir fahren um zwölf Uhr ab.', 'Wann fährt der Zug ab?'],
    },
    {
      word: 'die Abfahrt',
      forms: ['die Abfahrten'],
      examples: ['Vor der Abfahrt rufe ich an.'],
    },
  ],
  absender_adresse: [
    {
      word: 'der Absender',
      forms: [],
      examples: ['Da ist ein Brief für dich ohne Absender.'],
    },
    {
      word: 'Achtung',
      forms: [],
      examples: ['Achtung! Das dürfen Sie nicht tun.'],
    },
    {
      word: 'die Adresse',
      forms: ['die Adressen'],
      examples: ['Können Sie mir seine Adresse sagen?'],
    },
  ],
};

export const TRANSLATIONS: Record<string, Record<string, { translation: string; examples: string[] }>> = {
  english: {
    hören: {
      translation: 'to hear, to listen',
      examples: ['Listen. What is the song called?'],
    },
    'das Lied': {
      translation: 'the song',
      examples: ['The song is very beautiful.'],
    },
    aber: {
      translation: 'but, however',
      examples: ['From tomorrow I have to work.'],
    },
    abfahren: {
      translation: 'to depart, to leave',
      examples: ["We are departing at twelve o'clock.", 'When does the train leave?'],
    },
    'die Abfahrt': {
      translation: 'departure',
      examples: ['Before departure I will call.'],
    },
    'der Absender': {
      translation: 'sender',
      examples: ['There is a letter for you without a sender.'],
    },
    Achtung: {
      translation: 'attention, watch out',
      examples: ['Attention! You must not do that.'],
    },
    'die Adresse': {
      translation: 'address',
      examples: ['Can you tell me his address?'],
    },
  },
  hungarian: {
    hören: {
      translation: 'hallani, hallgatni',
      examples: ['Figyeljen. Hogy hívják a dalt?'],
    },
    'das Lied': {
      translation: 'a dal',
      examples: ['A dal nagyon szép.'],
    },
    aber: {
      translation: 'de, azonban',
      examples: ['Holnaptól dolgoznom kell.'],
    },
    abfahren: {
      translation: 'elindulni, elhagyni',
      examples: ['Tizenkét órakor indulunk.', 'Mikor indul a vonat?'],
    },
    'die Abfahrt': {
      translation: 'indulás',
      examples: ['Indulás előtt felhívlak.'],
    },
    'der Absender': {
      translation: 'feladó',
      examples: ['Itt van egy levél neked feladó nélkül.'],
    },
    Achtung: {
      translation: 'figyelem, vigyázat',
      examples: ['Figyelem! Ezt nem szabad csinálni.'],
    },
    'die Adresse': {
      translation: 'cím',
      examples: ['Meg tudod mondani a címét?'],
    },
  },
  'swiss-german': {
    hören: {
      translation: 'ghöra, lose',
      examples: ['Losed Sie. Wie heisst s Lied?'],
    },
    'das Lied': {
      translation: 's Lied',
      examples: ['S Lied isch sehr schön.'],
    },
    aber: {
      translation: 'aber, doch',
      examples: ['Ab morn muesi schaffe.'],
    },
    abfahren: {
      translation: 'abfahra, verlah',
      examples: ['Mir fahred am zwöufi ab.', 'Wänn fahrt de Zug ab?'],
    },
    'die Abfahrt': {
      translation: 'd Abfahrt',
      examples: ['Vor de Abfahrt rüefi aa.'],
    },
    'der Absender': {
      translation: 'de Absänder',
      examples: ['Da isch en Brief für di ohni Absänder.'],
    },
    Achtung: {
      translation: 'Achtig, pass uf',
      examples: ['Achtig! Das dörfed Sie nöd mache.'],
    },
    'die Adresse': {
      translation: 'd Adrässe',
      examples: ['Chönd Sie mir sini Adrässe säge?'],
    },
  },
};

export const GENDERS: Record<string, string> = {
  'das Lied': 'NEUTER',
  'die Abfahrt': 'FEMININE',
  'der Absender': 'MASCULINE',
  Achtung: 'FEMININE',
  'die Adresse': 'FEMININE',
};

export const WORD_TYPES: Record<string, string> = {
  hören: 'VERB',
  'das Lied': 'NOUN',
  aber: 'CONJUNCTION',
  abfahren: 'VERB',
  'die Abfahrt': 'NOUN',
  'der Absender': 'NOUN',
  Achtung: 'NOUN',
  'die Adresse': 'NOUN',
};

export const SENTENCE_LISTS: Record<string, string[]> = {
  speech_sentences: ['Hören Sie.', 'Wie heißt das Lied?'],
};

export const GRAMMAR_SENTENCE_LISTS: Record<string, string[]> = {
  grammar_sentences: [
    'Das [ist] Paco.',
    'Und [das] ist Frau Wachter.',
  ],
};

export const DICTIONARY_LOOKUPS: Record<string, Record<string, string>> = {
  hu: {
    fahren: [
      '<<H>><<B>>abfahren  <<B>>VERB<</B>><</B>>',
      '<<B>>Forms: <</B>>fährt ab, fuhr ab, ist abgefahren',
      '<<B>>Translation (hu): <</B>>elindulni, elhagyni',
      '',
      '<<B>>Example (de): <</B>>Wir fahren ab.',
      '<<B>>Example (hu): <</B>>Elindulunk.',
    ].join('\n'),
  },
  en: {
    fahren: [
      '<<H>><<B>>abfahren  <<B>>VERB<</B>><</B>>',
      '<<B>>Forms: <</B>>fährt ab, fuhr ab, ist abgefahren',
      '<<B>>Translation (en): <</B>>to depart, to leave',
      '',
      '<<B>>Example (de): <</B>>Wir fahren ab.',
      '<<B>>Example (en): <</B>>We depart.',
    ].join('\n'),
  },
};

export const NORMALIZATIONS: Record<string, { normalizedWord: string; forms: string[] }> = {
  fahren: { normalizedWord: 'abfahren', forms: ['fährt ab', 'fuhr ab', 'abgefahren'] },
  Haus: { normalizedWord: 'Haus', forms: ['die Häuser'] },
};

export const SENTENCE_TRANSLATIONS: Record<string, Record<string, string>> = {
  hungarian: {
    'Hören Sie.': 'Hallgasson.',
    'Wie heißt das Lied?': 'Hogy hívják a dalt?',
  },
  english: {
    'Hören Sie.': 'Listen.',
    'Wie heißt das Lied?': 'What is the name of the song?',
    'Das [ist] Paco.': 'This is Paco.',
    'Und [das] ist Frau Wachter.': 'And this is Frau Wachter.',
  },
};
