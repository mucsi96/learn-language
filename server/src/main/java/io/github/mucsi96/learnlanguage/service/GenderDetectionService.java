package io.github.mucsi96.learnlanguage.service;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GenderDetectionService {

  record GenderResult(String gender) {
  }

  private final ChatClient.Builder chatClientBuilder;

  public String detectGender(String noun) {
    var result = chatClientBuilder
        .defaultOptions(OpenAiChatOptions.builder().model("gpt-4.1").build())
        .build()
        .prompt()
        .system("""
            You are a German language expert.
            Your task is to determine the gender of the given German noun.
            Return the grammatical gender in capitalized form: MASCULINE, FEMININE, or NEUTER.
            """)
        .user("The noun is: %s.".formatted(noun))
        .call()
        .entity(GenderResult.class);

    return result.gender();
  }
}
