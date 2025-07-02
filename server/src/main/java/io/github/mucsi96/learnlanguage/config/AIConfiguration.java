package io.github.mucsi96.learnlanguage.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;

import io.github.mucsi96.learnlanguage.tracing.AITracingService;
import io.github.mucsi96.learnlanguage.tracing.TracebleOpenAIClient;

@Configuration
public class AIConfiguration {
  @Bean
  OpenAIClient openAIClient(AITracingService aiTracingService) {
    return new TracebleOpenAIClient(OpenAIOkHttpClient.fromEnv(), aiTracingService);
  }
}
