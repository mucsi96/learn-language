package io.github.mucsi96.learnlanguage.service;

import java.util.Map;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.TranslationRequest;
import io.github.mucsi96.learnlanguage.model.TranslationResponse;
import io.github.mucsi96.learnlanguage.model.WordResponse;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TranslationService {

  private static final String ENGLISH = "en";
  private static final String SWISS_GERMAN = "ch";
  private static final String HUNGARIAN = "hu";

  private static final Map<String, String> LANGUAGE_SPECIFIC_PROMPTS = Map.of(
      ENGLISH, """
          You are an English language expert.
          Your task is to translate the given German word and examples to English.
          Provide accurate translations that capture the meaning and context.
          """,
      SWISS_GERMAN, """
          You are a Swiss German language expert.
          Your task is to translate the given German word and examples to Swiss German.
          Focus on authentic Swiss German expressions and dialect.
          """,
      HUNGARIAN, """
          You are a Hungarian language expert.
          Your task is to translate the given German word and examples to Hungarian.
          Pay attention to proper Hungarian grammar and word forms.
          """);

  private final ObjectMapper objectMapper;
  private final ChatService chatService;

  public TranslationResponse translate(WordResponse word, String languageCode, ChatModel model) {
    TranslationRequest translationRequest = TranslationRequest.builder()
        .examples(word.getExamples())
        .word(word.getWord())
        .build();

    String translationRequestJson;
    try {
      translationRequestJson = objectMapper.writeValueAsString(translationRequest);
    } catch (Exception e) {
      throw new RuntimeException("Failed to serialize TranslationRequest to JSON", e);
    }

    String systemPrompt = LANGUAGE_SPECIFIC_PROMPTS.getOrDefault(languageCode, LANGUAGE_SPECIFIC_PROMPTS.get(ENGLISH));

    return chatService.callWithLogging(
        model,
        "translation",
        systemPrompt,
        translationRequestJson,
        TranslationResponse.class);
  }
}
