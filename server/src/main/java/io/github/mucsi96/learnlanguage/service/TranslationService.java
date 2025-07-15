package io.github.mucsi96.learnlanguage.service;

import java.util.Map;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openai.client.OpenAIClient;
import com.openai.models.ChatModel;
import com.openai.models.chat.completions.ChatCompletionCreateParams;

import io.github.mucsi96.learnlanguage.model.TranslationRequest;
import io.github.mucsi96.learnlanguage.model.TranslationResponse;
import io.github.mucsi96.learnlanguage.model.WordResponse;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TranslationService {

  // Language code constants
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

  private final OpenAIClient openAIClient;

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

    var createParams = ChatCompletionCreateParams.builder()
        .model(ChatModel.GPT_4_1)
        .addSystemMessage(LANGUAGE_SPECIFIC_PROMPTS.getOrDefault(languageCode, LANGUAGE_SPECIFIC_PROMPTS.get(ENGLISH)))
        .addUserMessage(translationRequestJson)
        .responseFormat(TranslationResponse.class)
        .build();

    var result = openAIClient.chat().completions().create(createParams).choices().stream()
        .flatMap(choice -> choice.message().content().stream()).findFirst()
        .orElseThrow(() -> new RuntimeException("No content returned from OpenAI API"));

    return result;
  }
}
