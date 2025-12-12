package io.github.mucsi96.learnlanguage.model;

import org.springframework.ai.anthropic.AnthropicChatModel;
import org.springframework.ai.anthropic.AnthropicChatOptions;
import org.springframework.ai.anthropic.api.AnthropicApi;
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public enum ChatModel {
  GPT_4O("gpt-4o"),
  GPT_4_1("gpt-4.1"),
  GPT_5("gpt-5"),
  CLAUDE_SONNET_4_5("claude-sonnet-4-5"),
  GEMINI_2_5_PRO_PREVIEW("gemini-3-pro-preview");

  private final String modelName;

  @JsonValue
  public String getModelName() {
    return modelName;
  }

  public org.springframework.ai.chat.model.ChatModel toChatModel() {
    return switch (this) {
      case GPT_4O -> OpenAiChatModel.builder()
          .defaultOptions(OpenAiChatOptions.builder().model(OpenAiApi.ChatModel.GPT_4_O).build()).build();
      case GPT_4_1 -> OpenAiChatModel.builder()
          .defaultOptions(OpenAiChatOptions.builder().model(OpenAiApi.ChatModel.GPT_4_1).build()).build();
      case GPT_5 -> OpenAiChatModel.builder()
          .defaultOptions(OpenAiChatOptions.builder().model(OpenAiApi.ChatModel.GPT_5_CHAT_LATEST).build()).build();
      case CLAUDE_SONNET_4_5 -> AnthropicChatModel.builder()
          .defaultOptions(AnthropicChatOptions.builder().model(AnthropicApi.ChatModel.CLAUDE_SONNET_4_5).build())
          .build();
      case GEMINI_2_5_PRO_PREVIEW -> GoogleGenAiChatModel.builder()
          .defaultOptions(GoogleGenAiChatOptions.builder().model(GoogleGenAiChatModel.ChatModel.GEMINI_3_PRO_PREVIEW).build())
          .build();
    };
  }

  @JsonCreator
  public static ChatModel fromString(String modelName) {
    for (ChatModel model : values()) {
      if (model.modelName.equals(modelName)) {
        return model;
      }
    }
    throw new IllegalArgumentException("Unknown chat model: " + modelName);
  }
}
