package io.github.mucsi96.learnlanguage.service;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WordTypeService {

  static record WordType(String word, String type) {
  }

  private final ChatModel model;

  public String detectWordType(String word) {
    var result = ChatClient.create(model).prompt()
        .system(
            """
                    You are a linguistic expert.
                    Your task is to determine the type of the given word (e.g., noun, verb, adjective) and reply in hungarian.
                    !IMPORTANT! Please provide the word type in the following JSON structure:
                    {
                        "word": "apple",
                        "type": "noun"
                    }
                """)
        .user(u -> u.text("The word is: {word}.").param("word", word))
        .call()
        .entity(WordType.class);
    return result.type;
  }
}
