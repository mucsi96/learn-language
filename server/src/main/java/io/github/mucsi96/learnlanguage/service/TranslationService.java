package io.github.mucsi96.learnlanguage.service;

import java.util.Map;

import org.springframework.ai.anthropic.AnthropicChatOptions;
import org.springframework.ai.anthropic.api.AnthropicApi;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import io.github.mucsi96.learnlanguage.model.TranslationRequest;
import io.github.mucsi96.learnlanguage.model.TranslationResponse;
import io.github.mucsi96.learnlanguage.model.WordResponse;

@Service
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

  private final ChatClient.Builder openAiChatClientBuilder;
  private final ChatClient.Builder anthropicChatClientBuilder;

  public TranslationService(
      @Qualifier("openAiChatClient") ChatClient.Builder openAiChatClientBuilder,
      @Qualifier("anthropicChatClient") ChatClient.Builder anthropicChatClientBuilder) {
    this.openAiChatClientBuilder = openAiChatClientBuilder;
    this.anthropicChatClientBuilder = anthropicChatClientBuilder;
  }

  public TranslationResponse translate(WordResponse word, String languageCode, ChatModel model) {
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

    String systemPrompt = LANGUAGE_SPECIFIC_PROMPTS.getOrDefault(languageCode, LANGUAGE_SPECIFIC_PROMPTS.get(ENGLISH));

    return switch (model) {
      case GPT_5 -> openAiChatClientBuilder
          .defaultOptions(OpenAiChatOptions.builder().model(OpenAiApi.ChatModel.GPT_5_CHAT_LATEST).build())
          .build()
          .prompt()
          .system(systemPrompt)
          .user(translationRequestJson)
          .call()
          .entity(TranslationResponse.class);
      case CLAUDE_SONNET_4_5 -> anthropicChatClientBuilder
          .defaultOptions(AnthropicChatOptions.builder().model(AnthropicApi.ChatModel.CLAUDE_SONNET_4_5_LATEST).build())
          .build()
          .prompt()
          .system(systemPrompt)
          .user(translationRequestJson)
          .call()
          .entity(TranslationResponse.class);
    };
  }
}
