package io.github.mucsi96.learnlanguage.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;

@Configuration
public class AIConfiguration {
  @Bean
  OpenAIClient openAIClient() {
    return OpenAIOkHttpClient.fromEnv();
  }
}
