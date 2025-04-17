package io.github.mucsi96.learnlanguage.service;

import java.util.Map;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.model.TranslationResponse;
import io.github.mucsi96.learnlanguage.model.WordResponse;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TranslationService {

  private static final Map<String, String> LANGUAGE_MAP = Map.of(
      "hu", "Hungarian",
      "ch", "Swiss German",
      "en", "English");

  private final ChatModel model;

  public TranslationResponse translate(WordResponse word, String languageCode) {
    String language = LANGUAGE_MAP.getOrDefault(languageCode, "English");

    return ChatClient.create(model).prompt()
        .system(
            s -> s.text("""
                You are a {language} language expert.
                Your task is to translate the given word and examples to {language}.
                The examples are optional.
                """).param("language", language))
        .user(u -> u.text("The word is: {word}.\nThe examples are:\n{examples}").param("word", word.getWord())
            .param("examples", String.join("\n", word.getExamples())))
        .call()
        .entity(TranslationResponse.class);
  }
}
