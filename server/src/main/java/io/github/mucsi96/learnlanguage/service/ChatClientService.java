package io.github.mucsi96.learnlanguage.service;

import org.springframework.ai.anthropic.AnthropicChatModel;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.ai.anthropic.AnthropicChatOptions;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ChatClientService {

  private final OpenAiChatModel openAiChatModel;
  private final AnthropicChatModel anthropicChatModel;
  private final GoogleGenAiChatModel googleGenAiChatModel;

  public ChatClient getChatClient(ChatModel model) {
    return switch (model) {
      case GPT_5_5 -> ChatClient.builder(openAiChatModel)
          .defaultOptions(OpenAiChatOptions.builder().model("gpt-5.5"))
          .build();
      case GPT_5_6_SOL -> ChatClient.builder(openAiChatModel)
          .defaultOptions(OpenAiChatOptions.builder().model("gpt-5.6-sol"))
          .build();
      case GPT_5_6_TERRA -> ChatClient.builder(openAiChatModel)
          .defaultOptions(OpenAiChatOptions.builder().model("gpt-5.6-terra"))
          .build();
      case GPT_5_6_LUNA -> ChatClient.builder(openAiChatModel)
          .defaultOptions(OpenAiChatOptions.builder().model("gpt-5.6-luna"))
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
      case GEMINI_3_1_PRO_PREVIEW -> ChatClient.builder(googleGenAiChatModel)
          .defaultOptions(GoogleGenAiChatOptions.builder().model("gemini-3.1-pro-preview"))
          .build();
      case GEMINI_3_FLASH_PREVIEW -> ChatClient.builder(googleGenAiChatModel)
          .defaultOptions(GoogleGenAiChatOptions.builder().model("gemini-3-flash-preview"))
          .build();
      case GEMINI_3_5_FLASH -> ChatClient.builder(googleGenAiChatModel)
          .defaultOptions(GoogleGenAiChatOptions.builder().model("gemini-3.5-flash"))
          .build();
      case GEMINI_3_6_FLASH -> ChatClient.builder(googleGenAiChatModel)
          .defaultOptions(GoogleGenAiChatOptions.builder().model("gemini-3.6-flash"))
          .build();
      case GEMINI_3_7_FLASH -> ChatClient.builder(googleGenAiChatModel)
          .defaultOptions(GoogleGenAiChatOptions.builder().model("gemini-3.7-flash"))
          .build();
    };
  }
}
