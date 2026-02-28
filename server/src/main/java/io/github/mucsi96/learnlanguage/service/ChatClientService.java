package io.github.mucsi96.learnlanguage.service;

import org.springframework.ai.anthropic.AnthropicChatModel;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.ai.anthropic.AnthropicChatOptions;
import org.springframework.ai.anthropic.api.AnthropicApi;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;
import org.springframework.ai.openaisdk.OpenAiSdkChatModel;
import org.springframework.ai.openaisdk.OpenAiSdkChatOptions;
import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ChatClientService {

  private final OpenAiSdkChatModel openAiChatModel;
  private final AnthropicChatModel anthropicChatModel;
  private final GoogleGenAiChatModel googleGenAiChatModel;

  public ChatClient getChatClient(ChatModel model) {
    return switch (model) {
      case GPT_4O -> ChatClient.builder(openAiChatModel)
          .defaultOptions(OpenAiSdkChatOptions.builder().model(com.openai.models.ChatModel.GPT_4O.toString()).build())
          .build();
      case GPT_4O_MINI -> ChatClient.builder(openAiChatModel)
          .defaultOptions(OpenAiSdkChatOptions.builder().model(com.openai.models.ChatModel.GPT_4O_MINI.toString()).build())
          .build();
      case GPT_4_1 -> ChatClient.builder(openAiChatModel)
          .defaultOptions(OpenAiSdkChatOptions.builder().model(com.openai.models.ChatModel.GPT_4_1.toString()).build())
          .build();
      case GPT_4_1_MINI -> ChatClient.builder(openAiChatModel)
          .defaultOptions(OpenAiSdkChatOptions.builder().model(com.openai.models.ChatModel.GPT_4_1_MINI.toString()).build())
          .build();
      case GPT_4_1_NANO -> ChatClient.builder(openAiChatModel)
          .defaultOptions(OpenAiSdkChatOptions.builder().model(com.openai.models.ChatModel.GPT_4_1_NANO.toString()).build())
          .build();
      case GPT_5 -> ChatClient.builder(openAiChatModel)
          .defaultOptions(OpenAiSdkChatOptions.builder().model(com.openai.models.ChatModel.GPT_5_CHAT_LATEST.toString()).build())
          .build();
      case GPT_5_2 -> ChatClient.builder(openAiChatModel)
          .defaultOptions(OpenAiSdkChatOptions.builder().model("gpt-5.2").build())
          .build();
      case GPT_5_MINI -> ChatClient.builder(openAiChatModel)
          .defaultOptions(OpenAiSdkChatOptions.builder().model("gpt-5-mini").build())
          .build();
      case GPT_5_NANO -> ChatClient.builder(openAiChatModel)
          .defaultOptions(OpenAiSdkChatOptions.builder().model("gpt-5-nano").build())
          .build();
      case CLAUDE_SONNET_4_5 -> ChatClient.builder(anthropicChatModel)
          .defaultOptions(AnthropicChatOptions.builder().model(AnthropicApi.ChatModel.CLAUDE_SONNET_4_5).build())
          .build();
      case CLAUDE_HAIKU_4_5 -> ChatClient.builder(anthropicChatModel)
          .defaultOptions(AnthropicChatOptions.builder().model(AnthropicApi.ChatModel.CLAUDE_HAIKU_4_5).build())
          .build();
      case GEMINI_3_1_PRO_PREVIEW -> ChatClient.builder(googleGenAiChatModel)
          .defaultOptions(GoogleGenAiChatOptions.builder().model("gemini-3.1-pro-preview").build())
          .build();
      case GEMINI_3_FLASH_PREVIEW -> ChatClient.builder(googleGenAiChatModel)
          .defaultOptions(GoogleGenAiChatOptions.builder().model("gemini-3-flash-preview").build())
          .build();
    };
  }
}
