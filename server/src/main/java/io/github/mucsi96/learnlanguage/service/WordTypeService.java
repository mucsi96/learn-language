package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.model.ChatModel;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WordTypeService {

  private static final String SYSTEM_PROMPT = """
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
      """;

  private final ChatService chatService;

  record WordTypeResult(String type) {
  }

  public String detectWordType(String word, ChatModel model) {
    var result = chatService.callWithLogging(
        model,
        "classification",
        SYSTEM_PROMPT,
        "The word is: %s.".formatted(word),
        WordTypeResult.class);

    return result.type();
  }
}
