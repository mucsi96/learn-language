package io.github.mucsi96.learnlanguage.config;

import org.springframework.ai.elevenlabs.api.ElevenLabsVoicesApi;
import org.springframework.ai.model.elevenlabs.autoconfigure.ElevenLabsConnectionProperties;
import org.springframework.ai.model.google.genai.autoconfigure.chat.GoogleGenAiConnectionProperties;
import org.springframework.ai.model.openaisdk.autoconfigure.OpenAiSdkConnectionProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.google.genai.Client;
import com.google.genai.types.HttpOptions;
import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;

@Configuration
public class AIConfiguration {
  private final String googleAiBaseUrl;

  AIConfiguration(@Value("${spring.ai.google.genai.base-url:#{null}}") String googleAiBaseUrl) {
    this.googleAiBaseUrl = googleAiBaseUrl;
  }

  @Bean
  OpenAIClient openAIClient(OpenAiSdkConnectionProperties connectionProperties) {
    var clientBuilder = OpenAIOkHttpClient.builder().apiKey(connectionProperties.getApiKey());

    if (connectionProperties.getBaseUrl() != null && !connectionProperties.getBaseUrl().isEmpty()) {
      clientBuilder.baseUrl(connectionProperties.getBaseUrl());
    }

    return clientBuilder.build();
  }

  @Bean
  Client googleAiClient(GoogleGenAiConnectionProperties connectionProperties) {
    Client.Builder clientBuilder = Client.builder().apiKey(connectionProperties.getApiKey());

    if (googleAiBaseUrl != null && !googleAiBaseUrl.isEmpty()) {
      clientBuilder.httpOptions(HttpOptions.builder().baseUrl(googleAiBaseUrl).build());
    }

    return clientBuilder.build();
  }

  @Bean
  ElevenLabsVoicesApi elevenLabsVoicesApi(ElevenLabsConnectionProperties connectionProperties) {
    return ElevenLabsVoicesApi.builder()
        .baseUrl(connectionProperties.getBaseUrl())
        .apiKey(connectionProperties.getApiKey())
        .build();
  }
}
