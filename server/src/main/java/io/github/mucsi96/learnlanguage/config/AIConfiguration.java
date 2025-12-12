package io.github.mucsi96.learnlanguage.config;

import org.springframework.ai.anthropic.AnthropicChatModel;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.elevenlabs.api.ElevenLabsVoicesApi;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import com.google.genai.Client;
import com.google.genai.types.HttpOptions;
import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;

@Configuration
public class AIConfiguration {

  @Value("${spring.ai.openai.api-key}")
  private String openAiApiKey;

  @Value("${spring.ai.openai.base-url:#{null}}")
  private String openAiBaseUrl;

  @Value("${google.ai.apiKey}")
  private String googleAiApiKey;

  @Value("${google.ai.baseUrl:#{null}}")
  private String googleAiBaseUrl;

  @Value("${spring.ai.elevenlabs.api-key}")
  private String elevenLabsApiKey;

  @Bean
  OpenAIClient openAIClient() {
    var clientBuilder = OpenAIOkHttpClient.builder().apiKey(openAiApiKey);

    if (openAiBaseUrl != null && !openAiBaseUrl.isEmpty()) {
      clientBuilder.baseUrl(openAiBaseUrl);
    }

    return clientBuilder.build();
  }

  @Bean
  Client googleAiClient() {
    Client.Builder clientBuilder = Client.builder().apiKey(googleAiApiKey);

    if (googleAiBaseUrl != null && !googleAiBaseUrl.isEmpty()) {
      clientBuilder.httpOptions(HttpOptions.builder().baseUrl(googleAiBaseUrl).build());
    }

    return clientBuilder.build();
  }

  @Bean
  ElevenLabsVoicesApi elevenLabsVoicesApi() {
    return ElevenLabsVoicesApi.builder()
        .apiKey(elevenLabsApiKey)
        .build();
  }

  @Bean
  @Primary
  @Qualifier("openAiChatClient")
  ChatClient.Builder openAiChatClientBuilder(OpenAiChatModel openAiChatModel) {
    return ChatClient.builder(openAiChatModel);
  }

  @Bean
  @Qualifier("anthropicChatClient")
  ChatClient.Builder anthropicChatClientBuilder(AnthropicChatModel anthropicChatModel) {
    return ChatClient.builder(anthropicChatModel);
  }
}
