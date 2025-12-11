package io.github.mucsi96.learnlanguage.service;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WordTypeService {

  record WordTypeResult(String type) {
  }

  private final ChatClient.Builder chatClientBuilder;

  public String detectWordType(String word) {
    var result = chatClientBuilder
        .defaultOptions(OpenAiChatOptions.builder().model("gpt-4.1").build())
        .build()
        .prompt()
        .system("""
            You are a linguistic expert.
            Your task is to categorize the given german word.
            You should ignore any articles or prefixes and focus on the core meaning of the word.
            The possible categories are:
            - VERB
            - ADJECTIVE
            - ADVERB
            - PRONOUN
            - PREPOSITION
            - CONJUNCTION
            - INTERJECTION
            - ARTICLE
            - NUMERAL
            - DETERMINER
            - NOUN
            """)
        .user("The word is: %s.".formatted(word))
        .call()
        .entity(WordTypeResult.class);

    return result.type();
  }
}
