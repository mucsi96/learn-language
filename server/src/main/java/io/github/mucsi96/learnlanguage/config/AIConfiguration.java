package io.github.mucsi96.learnlanguage.config;

import org.springframework.ai.elevenlabs.api.ElevenLabsVoicesApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.google.genai.Client;
import com.google.genai.types.HttpOptions;

@Configuration
public class AIConfiguration {

  @Value("${google.ai.apiKey}")
  private String googleAiApiKey;

  @Value("${google.ai.baseUrl:#{null}}")
  private String googleAiBaseUrl;

  @Value("${spring.ai.elevenlabs.api-key}")
  private String elevenLabsApiKey;

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
}
