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

  private static final Map<String, String> LANGUAGE_MAP = Map.of(
      "hu", "Hungarian",
      "ch", "Swiss German",
      "en", "English");

  private final OpenAIClient openAIClient;

  public TranslationResponse translate(WordResponse word, String languageCode) {
    String language = LANGUAGE_MAP.getOrDefault(languageCode, "English");

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
        .addSystemMessage(
            """
                You are a %s language expert.
                Your task is to translate the given word and examples to %s.
                The examples are optional.
                json_structure:
                {
                  "examples":["Listen to the announcements."],
                  "translation":"announcement"
                }
                """.formatted(language, language))
        .addUserMessage(translationRequestJson)
        .responseFormat(TranslationResponse.class)
        .build();

    var result = openAIClient.chat().completions().create(createParams).choices().stream()
        .flatMap(choice -> choice.message().content().stream()).findFirst()
        .orElseThrow(() -> new RuntimeException("No content returned from OpenAI API"));

    return result;
  }
}
