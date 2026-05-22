package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.ai.content.Media;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeType;
import org.springframework.util.MimeTypeUtils;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.LanguageLevel;
import io.github.mucsi96.learnlanguage.model.OperationType;
import lombok.RequiredArgsConstructor;
import tools.jackson.databind.json.JsonMapper;

@Service
@RequiredArgsConstructor
public class PhotoGrammarConceptService {

  record ConceptSentences(List<String> sentences) {
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
        - Each sentence has exactly one blank, marked by wrapping the target word or form in square brackets. Example: "Ich gehe jeden [Tag] in die Schule.", "Der Hund [läuft] schnell durch [den] Park." - in the second example there are two brackets only if a single concept requires more than one blank to express; prefer ONE blank per sentence.
        - Each sentence must be a complete standalone German sentence with proper capitalisation and punctuation.
        - Sentences must be appropriate for %s level learners.
        - Skip any handwritten text on the photo.
        - !IMPORTANT! Respond ONLY with JSON in the form {"sentences": [...]} matching the example below.
        """.formatted(cardCount, languageLevel.name(), languageLevel.name());

    final ConceptSentences example = new ConceptSentences(List.of(
        "Ich gehe jeden [Tag] in die Schule.",
        "Der Hund läuft schnell durch [den] Park."));

    final String exampleJson = jsonMapper.writeValueAsString(example);
    return basePrompt + "\nExample JSON response shape:\n" + exampleJson;
  }

  public List<String> generateConceptCards(
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

    return result.sentences;
  }
}
