package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.ai.content.Media;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeType;
import org.springframework.util.MimeTypeUtils;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.LanguageLevel;
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
        You are an expert German language teacher. You are looking at a photo of a page from a German grammar textbook lesson.

        Your task:
        1. Identify the grammatical concepts the lesson is teaching (rules, paradigms, exceptions, vocabulary in scope, sentence patterns). Examples: dative prepositions, modal verb conjugation, separable verbs in Perfekt, adjective endings, two-way prepositions, relative clauses, reflexive verbs, etc.
        2. Generate exactly %d original German practice sentences at language level %s. The sentences together must cover the breadth of the concepts you identified - distribute coverage across all concepts and avoid repeating the same pattern.

        Rules:
        - !IMPORTANT! Do NOT copy the printed exercise sentences from the photo verbatim. Produce fresh, original sentences that exercise the same concepts.
        - Each sentence has ONE OR MORE blanks, depending on what the exercise teaches. Wrap each target word or form in square brackets. Example single blank: "Ich gehe jeden [Tag] in die Schule." Example multiple blanks: "[Der] Mann gibt [dem] Kind das Buch." Use multiple blanks only when the underlying exercise naturally requires it (e.g. article + adjective ending together, two-way preposition + article, paired conjugation patterns).
        - Each sentence must be a complete standalone German sentence with proper capitalisation and punctuation.
        - Sentences must be appropriate for %s level learners.
        - Skip any handwritten text on the photo.
        - After producing each sentence, judge whether ANY blank is ambiguous - i.e. multiple valid German words or forms could plausibly fit the blank purely from the surrounding context (without seeing the textbook lesson).
        - If at least one blank is ambiguous, include a "hint" field. The hint is a single German string covering ALL blanks in the sentence. When more than one blank needs disambiguation, separate the per-blank hints with " / " in the same order the blanks appear. Examples: verb conjugation blank -> infinitive (e.g. "gehen"); noun gender/case blank -> nominative with article (e.g. "der Tag"); adjective ending blank -> base adjective; combined article + verb blanks -> "der / gehen".
        - The "hint" MUST always be in German. Never English, Hungarian or Swiss German.
        - If no blank is ambiguous, OMIT the "hint" field entirely. Do not emit it as null or an empty string.
        - !IMPORTANT! Respond ONLY with JSON in the form {"sentences": [...]} matching the example below.
        """.formatted(cardCount, languageLevel.name(), languageLevel.name());

    final ConceptSentences example = new ConceptSentences(List.of(
        new ConceptSentence("Heute [bin] ich müde.", "sein"),
        new ConceptSentence("[Der] Mann gibt [dem] Kind das Buch.", "der / der"),
        new ConceptSentence("Der Hund läuft schnell durch den [Park].", null)));

    final String exampleJson = jsonMapper.writeValueAsString(example);
    return basePrompt + "\nExample JSON response shape:\n" + exampleJson;
  }

  public List<SentenceWithHint> generateConceptCards(
      byte[] imageData,
      String contentType,
      ChatModel model,
      LanguageLevel languageLevel,
      int cardCount) {
    final MimeType mimeType = contentType != null && !contentType.isBlank()
        ? MimeTypeUtils.parseMimeType(contentType)
        : MimeTypeUtils.IMAGE_PNG;

    final var result = chatService.callWithLoggingAndMedia(
        model,
        OperationType.EXTRACTION,
        buildSystemPrompt(languageLevel, cardCount),
        imageData,
        u -> u
            .text("Here is the photo of the grammar lesson page. Generate exactly %d sentences.".formatted(cardCount))
            .media(Media.builder()
                .data(imageData)
                .mimeType(mimeType)
                .build()),
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
