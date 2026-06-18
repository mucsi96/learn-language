package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.ai.content.Media;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeType;
import org.springframework.util.MimeTypeUtils;

import io.github.mucsi96.learnlanguage.model.LanguageLevel;
import io.github.mucsi96.learnlanguage.model.LessonDescription;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.service.PhotoPreprocessingService.PreparedPage;
import lombok.RequiredArgsConstructor;
import tools.jackson.databind.json.JsonMapper;

@Service
@RequiredArgsConstructor
public class LessonDescriptionService {

  private final JsonMapper jsonMapper;
  private final ChatService chatService;
  private final ChatModelSettingService chatModelSettingService;

  private String buildSystemPrompt(LanguageLevel languageLevel) {
    final String basePrompt = """
        You are analysing a photo of a German grammar textbook lesson page to produce a structured lesson description.

        Your task:
        1. Identify the single grammatical focus of the lesson and give it a concise German title (the key focus of the topic).
        2. Determine the CEFR language level of the lesson. The source is configured as level %s - use that as a strong prior, but correct it if the page clearly targets a different level.
        3. Write a short summary (2-4 sentences) in German describing what the lesson teaches: the rules, paradigms, exceptions and patterns in scope.
        4. List a few (3-6) representative example items from the page that illustrate the concept.

        Rules:
        - Skip any handwritten text on the photo.
        - The title and summary MUST be in German.
        - If the photos show two pages, treat them as one continuous lesson.
        - !IMPORTANT! Respond ONLY with JSON matching the example below.
        """.formatted(languageLevel.name());

    final LessonDescription example = new LessonDescription(
        "Konjugation von \"sein\" im Präsens",
        languageLevel,
        "Die Lektion behandelt die Konjugation des Verbs \"sein\" im Präsens und die Verwendung der Personalpronomen als Subjekt.",
        List.of("ich bin", "du bist", "er/sie/es ist"));

    final String exampleJson = jsonMapper.writeValueAsString(example);
    return basePrompt + "\nExample JSON response shape:\n" + exampleJson;
  }

  public LessonDescription describe(List<PreparedPage> pages, LanguageLevel languageLevel) {
    final String userText = pages.size() > 1
        ? "Here are the photos of the grammar lesson pages. Describe the lesson."
        : "Here is the photo of the grammar lesson page. Describe the lesson.";

    return chatService.callWithLoggingAndMedia(
        chatModelSettingService.getPrimaryModel(OperationType.LESSON_DESCRIPTION),
        OperationType.LESSON_DESCRIPTION,
        buildSystemPrompt(languageLevel),
        pages.get(0).imageData(),
        u -> pages.stream().reduce(
            u.text(userText),
            (spec, page) -> spec.media(toMedia(page)),
            (first, second) -> first),
        LessonDescription.class);
  }

  private Media toMedia(PreparedPage page) {
    final MimeType mimeType = page.contentType() != null && !page.contentType().isBlank()
        ? MimeTypeUtils.parseMimeType(page.contentType())
        : MimeTypeUtils.IMAGE_PNG;
    return Media.builder()
        .data(page.imageData())
        .mimeType(mimeType)
        .build();
  }
}
