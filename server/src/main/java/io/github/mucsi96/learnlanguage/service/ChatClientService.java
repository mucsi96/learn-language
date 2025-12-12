package io.github.mucsi96.learnlanguage.service;

import org.springframework.ai.anthropic.AnthropicChatModel;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.ai.anthropic.AnthropicChatOptions;
import org.springframework.ai.anthropic.api.AnthropicApi;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;
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
      case GPT_4O -> ChatClient.builder(openAiChatModel)
          .defaultOptions(OpenAiChatOptions.builder().model(OpenAiApi.ChatModel.GPT_4_O).build())
          .build();
      case GPT_4_1 -> ChatClient.builder(openAiChatModel)
          .defaultOptions(OpenAiChatOptions.builder().model(OpenAiApi.ChatModel.GPT_4_1).build())
          .build();
      case GPT_5 -> ChatClient.builder(openAiChatModel)
          .defaultOptions(OpenAiChatOptions.builder().model(OpenAiApi.ChatModel.GPT_5_CHAT_LATEST).build())
          .build();
      case CLAUDE_SONNET_4_5 -> ChatClient.builder(anthropicChatModel)
          .defaultOptions(AnthropicChatOptions.builder().model(AnthropicApi.ChatModel.CLAUDE_SONNET_4_5).build())
          .build();
      case GEMINI_2_5_PRO_PREVIEW -> ChatClient.builder(googleGenAiChatModel)
          .defaultOptions(GoogleGenAiChatOptions.builder().model(GoogleGenAiChatModel.ChatModel.GEMINI_3_PRO_PREVIEW).build())
          .build();
    };
  }
}
