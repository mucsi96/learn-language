export const TRANSLATIONS: Record<string, Record<string, { translation: string; examples: string[] }>> = {
  english: {
    'aber': {
      translation: 'but, however',
      examples: ['From tomorrow I have to work.'],
    },
    'abfahren': {
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
    'Achtung': {
      translation: 'attention, watch out',
      examples: ['Attention! You must not do that.'],
    },
    'die Adresse': {
      translation: 'address',
      examples: ['Can you tell me his address?'],
    },
  },
  hungarian: {
    'aber': {
      translation: 'de, azonban',
      examples: ['Holnaptól dolgoznom kell.'],
    },
    'abfahren': {
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
    'Achtung': {
      translation: 'figyelem, vigyázat',
      examples: ['Figyelem! Ezt nem szabad csinálni.'],
    },
    'die Adresse': {
      translation: 'cím',
      examples: ['Meg tudod mondani a címét?'],
    },
  },
  'swiss-german': {
    'aber': {
      translation: 'aber, doch',
      examples: ['Ab morn muesi schaffe.'],
    },
    'abfahren': {
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
    'Achtung': {
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
  'die Abfahrt': 'FEMININE',
  'der Absender': 'MASCULINE',
  'Achtung': 'FEMININE',
  'die Adresse': 'FEMININE'
};

export const WORD_TYPES: Record<string, string> = {
  'aber': 'CONJUNCTION',
  'abfahren': 'VERB',
  'die Abfahrt': 'NOUN',
  'der Absender': 'NOUN',
  'Achtung': 'NOUN',
  'die Adresse': 'NOUN',
};
