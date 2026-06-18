package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.LanguageLevel;
import io.github.mucsi96.learnlanguage.model.LessonDescription;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.model.SentenceWithHint;
import lombok.RequiredArgsConstructor;
import tools.jackson.databind.json.JsonMapper;

@Service
@RequiredArgsConstructor
public class PhotoGrammarConceptService {

  record ConceptSentence(String sentence, String hint) {
  }

  record ConceptSentences(List<ConceptSentence> sentences) {
  }

  private final JsonMapper jsonMapper;
  private final ChatService chatService;

  private String buildSystemPrompt(LanguageLevel languageLevel, int cardCount) {
    final String basePrompt = """
        You are an expert German language teacher. You are given a structured description of a German grammar textbook lesson (title, level, summary and example items).

        Your task:
        1. Identify the grammatical concepts the lesson is teaching (rules, paradigms, exceptions, vocabulary in scope, sentence patterns). Examples: dative prepositions, modal verb conjugation, separable verbs in Perfekt, adjective endings, two-way prepositions, relative clauses, reflexive verbs, etc.
        2. Generate exactly %d original German practice sentences at language level %s. The sentences together must cover the breadth of the concepts you identified - distribute coverage across all concepts and avoid repeating the same pattern.

        Rules:
        - !IMPORTANT! Do NOT copy the example items from the lesson description verbatim. Produce fresh, original sentences that exercise the same concepts.
        - Each sentence has ONE OR MORE blanks, depending on what the exercise teaches. Wrap each target word or form in square brackets. Example single blank: "Ich gehe jeden [Tag] in die Schule." Example multiple blanks: "[Der] Mann gibt [dem] Kind das Buch." Use multiple blanks only when the underlying exercise naturally requires it (e.g. article + adjective ending together, two-way preposition + article, paired conjugation patterns).
        - Each sentence must be a complete standalone German sentence with proper capitalisation and punctuation.
        - Sentences must be appropriate for %s level learners.
        - After producing each sentence, judge whether ANY blank is ambiguous - i.e. multiple valid German words or forms could plausibly fit the blank purely from the surrounding context (without seeing the textbook lesson).
        - Also judge a second kind of ambiguity: even after the base hint (e.g. the infinitive) is known, the required INFLECTED form may still be ambiguous because a grammatical feature (person, number, gender, case or tense) is not uniquely fixed by the sentence. The most common trigger is an ambiguous subject pronoun: "sie" can be 3rd person singular ("she") or 3rd person plural ("they"), and "Sie" is the formal "you" - so several conjugations fit the same blank (e.g. "machte" vs. "machten"). Treat such a blank as ambiguous.
        - If at least one blank is ambiguous, include a "hint" field. The hint is a single German string covering ALL blanks in the sentence. When more than one blank needs disambiguation, separate the per-blank hints with " / " in the same order the blanks appear. Examples: verb conjugation blank -> infinitive (e.g. "gehen"); noun gender/case blank -> nominative with article (e.g. "der Tag"); adjective ending blank -> base adjective; combined article + verb blanks -> "der / gehen".
        - When the inflected form stays ambiguous after the base hint (e.g. the ambiguous subject "sie"/"Sie" above), ENHANCE the hint so it pins down the exact form: append the distinguishing grammatical feature in German, in parentheses, after the base hint. Example: verb conjugation with an ambiguous subject -> "machen (3. Person Singular)".
        - The "hint" MUST always be in German. Never English, Hungarian or Swiss German.
        - If no blank is ambiguous, OMIT the "hint" field entirely. Do not emit it as null or an empty string.
        - !IMPORTANT! Respond ONLY with JSON in the form {"sentences": [...]} matching the example below.
        """.formatted(cardCount, languageLevel.name(), languageLevel.name());

    final ConceptSentences example = new ConceptSentences(List.of(
        new ConceptSentence("Heute [bin] ich müde.", "sein"),
        new ConceptSentence("[Der] Mann gibt [dem] Kind das Buch.", "der / der"),
        new ConceptSentence("Im Sommer [machte] sie oft Sport im Park.", "machen (3. Person Singular)"),
        new ConceptSentence("Der Hund läuft schnell durch den [Park].", null)));

    final String exampleJson = jsonMapper.writeValueAsString(example);
    return basePrompt + "\nExample JSON response shape:\n" + exampleJson;
  }

  public List<SentenceWithHint> generateConceptCards(
      LessonDescription lessonDescription,
      ChatModel model,
      LanguageLevel languageLevel,
      int cardCount) {
    final String userMessage = """
        Here is the structured description of the grammar lesson. Generate exactly %d sentences.

        %s
        """.formatted(cardCount, jsonMapper.writeValueAsString(lessonDescription));

    final var result = chatService.callWithLogging(
        model,
        OperationType.CARD_GENERATION,
        buildSystemPrompt(languageLevel, cardCount),
        userMessage,
        ConceptSentences.class);

    return result.sentences().stream()
        .map(item -> SentenceWithHint.builder()
            .sentence(item.sentence())
            .hint(normalizeHint(item.hint()))
            .build())
        .toList();
  }

  private String normalizeHint(String hint) {
    if (hint == null) {
      return null;
    }
    final String trimmed = hint.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
