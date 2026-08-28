package io.github.mucsi96.learnlanguage.service;

import org.springframework.ai.anthropic.AnthropicChatModel;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.ai.anthropic.AnthropicChatOptions;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.config.XaiChatModel;
import io.github.mucsi96.learnlanguage.model.ChatModel;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ChatClientService {

  private final OpenAiChatModel openAiChatModel;
  private final AnthropicChatModel anthropicChatModel;
  private final GoogleGenAiChatModel googleGenAiChatModel;
  private final XaiChatModel xaiChatModel;

  public ChatClient getChatClient(ChatModel model) {
    return switch (model) {
      case GPT_5_5, GPT_5_6_SOL, GPT_5_6_TERRA, GPT_5_6_LUNA -> ChatClient.builder(openAiChatModel)
          .defaultOptions(OpenAiChatOptions.builder().model(model.getModelName()))
          .build();
      case CLAUDE_SONNET_4_5 -> ChatClient.builder(anthropicChatModel)
          .defaultOptions(AnthropicChatOptions.builder().model(com.anthropic.models.messages.Model.CLAUDE_SONNET_4_5))
          .build();
      case CLAUDE_SONNET_5 -> ChatClient.builder(anthropicChatModel)
          .defaultOptions(AnthropicChatOptions.builder().model(com.anthropic.models.messages.Model.of("claude-sonnet-5")))
          .build();
      case CLAUDE_HAIKU_4_5 -> ChatClient.builder(anthropicChatModel)
          .defaultOptions(AnthropicChatOptions.builder().model(com.anthropic.models.messages.Model.CLAUDE_HAIKU_4_5))
          .build();
      case CLAUDE_OPUS_4_8 -> ChatClient.builder(anthropicChatModel)
          .defaultOptions(AnthropicChatOptions.builder().model(com.anthropic.models.messages.Model.of("claude-opus-4-8")))
          .build();
      case GROK_4_6, GROK_4_3 -> ChatClient.builder(xaiChatModel.chatModel())
          .defaultOptions(OpenAiChatOptions.builder().model(model.getModelName()))
          .build();
      case GEMINI_3_1_PRO_PREVIEW, GEMINI_3_FLASH_PREVIEW, GEMINI_3_5_FLASH, GEMINI_3_6_FLASH,
          GEMINI_3_7_FLASH ->
        ChatClient.builder(googleGenAiChatModel)
            .defaultOptions(GoogleGenAiChatOptions.builder().model(model.getModelName()))
            .build();
    };
  }
}
