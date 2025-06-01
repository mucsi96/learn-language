package io.github.mucsi96.learnlanguage.service;

import java.util.Map;

import org.springframework.stereotype.Service;

import com.openai.client.OpenAIClient;
import com.openai.models.ChatModel;
import com.openai.models.chat.completions.ChatCompletionCreateParams;

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

    var createParams = ChatCompletionCreateParams.builder()
        .model(ChatModel.GPT_4_1)
        .addSystemMessage(
            """
                You are a %s language expert.
                Your task is to translate the given word and examples to %s.
                The examples are optional.
                """.formatted(language, language))
        .addUserMessage("The word is: %s.\nThe examples are:\n%s"
            .formatted(word.getWord(), String.join("\n", word.getExamples())))
        .responseFormat(TranslationResponse.class)
        .build();

    var result = openAIClient.chat().completions().create(createParams).choices().stream()
        .flatMap(choice -> choice.message().content().stream()).findFirst()
        .orElseThrow(() -> new RuntimeException("No content returned from OpenAI API"));

    return result;
  }
}
