package io.github.mucsi96.learnlanguage.service;

final class HungarianTranslationPrompt {

  private HungarianTranslationPrompt() {
  }

  static final String RECALL_GUIDELINES = """
      These translations are used on Hungarian-to-German recall flashcards. The learner sees
      the Hungarian sentence first and tries to recall the original German sentence.
      Produce grammatical, natural Hungarian that preserves the German sentence's explicit
      meaning and lexical choices as closely as possible. Prefer a close equivalent over a
      free paraphrase when both are natural.

      Preserve the participants, actions or states, tense, negation, modality, quantities,
      and time, place and direction details. Do not add habitual meaning, intention, causes,
      or a different action merely because it describes a similar real-world situation.
      Use natural Hungarian grammar, not German word order or forced word-for-word calques.
      Translate idioms as meaningful units; never distort their meaning to preserve individual words.
      Do not insert German words, hints, alternatives or explanations into the translation.

      Examples of closer recall cues:
      - "Der Wind kommt aus Osten." -> "A szél keletről jön."
        Avoid "A szél keletről fúj.", which cues "weht" rather than "kommt".
      - "Ich habe die Schlüssel in der Tasche." -> "A kulcsok nálam vannak a táskában."
        Avoid "A kulcsokat a táskában tartom.", which adds keeping or storing rather than having.
      - "Wir bekommen am Wochenende Besuch." -> "Hétvégén látogatók érkeznek hozzánk."
        Preserve the arrival of visitors rather than only saying we will have guests.

      Before responding, check whether the Hungarian unnecessarily suggests a different German
      action, meaning or construction. Revise avoidable differences while keeping natural Hungarian.
      Exact German wording cannot always be recovered uniquely; do not sacrifice accuracy or
      idiomatic Hungarian to force a unique answer.
      """;
}
