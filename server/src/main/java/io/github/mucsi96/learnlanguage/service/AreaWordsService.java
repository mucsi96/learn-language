package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.content.Media;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeTypeUtils;

import com.fasterxml.jackson.databind.ObjectMapper;

import io.github.mucsi96.learnlanguage.model.WordResponse;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AreaWordsService {

  record AreaWords(List<WordResponse> wordList) {
  }

  private final ObjectMapper objectMapper;
  private final WordIdService wordIdService;

  private String buildSystemPrompt() {
    String basePrompt = """
        You are a linguistic expert.
        You task is to extract the wordlist data from provided page image.
        !IMPORTANT! In response please provide all extracted words in JSON array with objects containing following properties: "word", "forms", "examples".
        The word property holds a string. it's the basic form of the word without any forms.
        The forms is a string array representing the different forms. In case of a noun it the plural form.
        In case of verb it's the 3 forms of conjugation (Eg. Du gehst, Er/Sie/Es geht, Er/Sie/Es ist gegangen). Please enhance it to make those full words. Not just endings.
        The examples property is a string array enlisting the examples provided in the document.""";

    AreaWords example = new AreaWords(List.of(
        WordResponse.builder()
            .word("das Haus")
            .forms(List.of("die Häuser"))
            .examples(List.of("Das Haus ist groß."))
            .build(),
        WordResponse.builder()
            .word("gehen")
            .forms(List.of("gehst", "geht", "ist gegangen"))
            .examples(List.of("Ich gehe jetzt.", "Er ist nach Hause gegangen."))
            .build()));

    try {
      String exampleJson = objectMapper.writeValueAsString(example);
      return basePrompt + "\nExample of the expected JSON response:\n" + exampleJson;
    } catch (Exception e) {
      throw new RuntimeException("Failed to serialize example to JSON", e);
    }
  }

  public List<WordResponse> getAreaWords(byte[] imageData, ChatClient chatClient) {
    var result = chatClient
        .prompt()
        .system(buildSystemPrompt())
        .user(u -> u
            .text("Here is the image of the page")
            .media(Media.builder()
                .data(imageData)
                .mimeType(MimeTypeUtils.IMAGE_PNG)
                .build()))
        .call()
        .entity(AreaWords.class);

    return result.wordList.stream().map(word -> {
      word.setId(wordIdService.generateWordId(word.getWord()));
      return word;
    }).toList();
  }
}
