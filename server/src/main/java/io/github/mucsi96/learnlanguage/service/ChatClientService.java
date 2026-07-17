package io.github.mucsi96.learnlanguage.service;

import java.util.Optional;

import org.springframework.ai.anthropic.AnthropicChatModel;
import org.springframework.ai.anthropic.AnthropicChatOptions;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;
import org.springframework.ai.google.genai.common.GoogleGenAiThinkingLevel;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.stereotype.Service;

import com.anthropic.models.messages.Model;
import com.anthropic.models.messages.OutputConfig;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ChatClientService {

  private final OpenAiChatModel openAiChatModel;
  private final AnthropicChatModel anthropicChatModel;
  private final GoogleGenAiChatModel googleGenAiChatModel;

  public ChatClient getChatClient(ChatModel model) {
    return switch (model.getProvider()) {
      case OPENAI -> ChatClient.builder(openAiChatModel)
          .defaultOptions(openAiOptions(model))
          .build();
      case ANTHROPIC -> ChatClient.builder(anthropicChatModel)
          .defaultOptions(anthropicOptions(model))
          .build();
      case GOOGLE -> ChatClient.builder(googleGenAiChatModel)
          .defaultOptions(googleOptions(model))
          .build();
      default -> throw new IllegalArgumentException("Unsupported chat model provider: " + model.getProvider());
    };
  }

  private OpenAiChatOptions.Builder openAiOptions(ChatModel model) {
    final OpenAiChatOptions.Builder builder = OpenAiChatOptions.builder().model(model.getApiModelName());
    Optional.ofNullable(model.getEffort()).ifPresent(builder::reasoningEffort);
    return builder;
  }

  private AnthropicChatOptions.Builder anthropicOptions(ChatModel model) {
    final AnthropicChatOptions.Builder builder = AnthropicChatOptions.builder()
        .model(Model.of(model.getApiModelName()));
    Optional.ofNullable(model.getEffort())
        .ifPresent(effort -> builder.effort(OutputConfig.Effort.of(effort)));
    return builder;
  }

  private GoogleGenAiChatOptions.Builder googleOptions(ChatModel model) {
    final GoogleGenAiChatOptions.Builder builder = GoogleGenAiChatOptions.builder()
        .model(model.getApiModelName());
    Optional.ofNullable(model.getEffort())
        .ifPresent(effort -> builder.thinkingLevel(GoogleGenAiThinkingLevel.valueOf(effort.toUpperCase())));
    return builder;
  }
}
