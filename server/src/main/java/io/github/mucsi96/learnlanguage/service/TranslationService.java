package io.github.mucsi96.learnlanguage.service;

import java.util.Map;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.ImmutableMap;
import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Part;
import com.google.genai.types.Schema;
import com.google.genai.types.Type;

import io.github.mucsi96.learnlanguage.model.TranslationRequest;
import io.github.mucsi96.learnlanguage.model.TranslationResponse;
import io.github.mucsi96.learnlanguage.model.WordResponse;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TranslationService {

  private static final String GEMINI_MODEL = "gemini-3-pro-preview-11-2025";

  private static final String ENGLISH = "en";
  private static final String SWISS_GERMAN = "ch";
  private static final String HUNGARIAN = "hu";

  private static final Map<String, String> LANGUAGE_SPECIFIC_PROMPTS = Map.of(
      ENGLISH, """
            You are an English language expert.
            Your task is to translate the given German word and examples to English.
            Provide accurate translations that capture the meaning and context.
            Example of the expected JSON response:
            {
              "translation":"announcement"
              "examples":["Listen to the announcements."],
            }
            """,
      SWISS_GERMAN, """
            You are a Swiss German language expert.
            Your task is to translate the given German word and examples to Swiss German.
            Focus on authentic Swiss German expressions and dialect.
            Example of the expected JSON response:
            {
              "translation":"Ankündigung"
              "examples":["Losedu uf d'Ankündigunge."],
            }
            """,
      HUNGARIAN, """
            You are a Hungarian language expert.
            Your task is to translate the given German word and examples to Hungarian.
            Pay attention to proper Hungarian grammar and word forms.
            Example of the expected JSON response:
            {
              "translation":"bejelentés"
              "examples":["Figyeld a bejelentéseket."],
            }
            """);

  private final Client googleAiClient;

  public TranslationResponse translate(WordResponse word, String languageCode) {

    TranslationRequest translationRequest = TranslationRequest.builder()
        .examples(word.getExamples())
        .word(word.getWord())
        .build();

    var objectMapper = new ObjectMapper();
    String translationRequestJson;
    try {
      translationRequestJson = objectMapper.writeValueAsString(translationRequest);
    } catch (Exception e) {
      throw new RuntimeException("Failed to serialize TranslationRequest to JSON", e);
    }

    Schema responseSchema = Schema.builder()
        .type(Type.Known.OBJECT)
        .properties(ImmutableMap.of(
            "translation", Schema.builder().type(Type.Known.STRING).build(),
            "examples", Schema.builder()
                .type(Type.Known.ARRAY)
                .items(Schema.builder().type(Type.Known.STRING).build())
                .build()))
        .required("translation", "examples")
        .build();

    GenerateContentConfig config = GenerateContentConfig.builder()
        .responseMimeType("application/json")
        .candidateCount(1)
        .responseSchema(responseSchema)
        .systemInstruction(Content.builder()
            .role("user")
            .parts(Part.text(LANGUAGE_SPECIFIC_PROMPTS.getOrDefault(languageCode, LANGUAGE_SPECIFIC_PROMPTS.get(ENGLISH))))
            .build())
        .build();

    GenerateContentResponse response = googleAiClient.models.generateContent(
        GEMINI_MODEL,
        translationRequestJson,
        config);

    String responseText = response.text();

    try {
      return objectMapper.readValue(responseText, TranslationResponse.class);
    } catch (Exception e) {
      throw new RuntimeException("Failed to deserialize response from Gemini API: " + responseText, e);
    }
  }
}
