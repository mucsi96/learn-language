package io.github.mucsi96.learnlanguage.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.google.genai.Client;
import com.google.genai.types.HttpOptions;
import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;

import io.github.mucsi96.learnlanguage.tracing.AITracingService;
import io.github.mucsi96.learnlanguage.tracing.TracebleOpenAIClient;

@Configuration
public class AIConfiguration {
  
  @Value("${google.ai.apiKey}")
  private String googleAiApiKey;
  
  @Value("${google.ai.baseUrl:#{null}}")
  private String googleAiBaseUrl;
  
  @Bean
  OpenAIClient openAIClient(AITracingService aiTracingService) {
    return new TracebleOpenAIClient(OpenAIOkHttpClient.fromEnv(), aiTracingService);
  }
  
  @Bean
  Client googleAiClient() {
    Client.Builder clientBuilder = Client.builder().apiKey(googleAiApiKey);
    
    if (googleAiBaseUrl != null && !googleAiBaseUrl.isEmpty()) {
      clientBuilder.httpOptions(HttpOptions.builder().baseUrl(googleAiBaseUrl).build());
    }
    
    return clientBuilder.build();
  }
}
