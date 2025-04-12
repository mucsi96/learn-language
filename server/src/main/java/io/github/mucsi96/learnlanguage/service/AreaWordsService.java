package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.content.Media;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeTypeUtils;

import io.github.mucsi96.learnlanguage.model.WordResponse;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AreaWordsService {

  static record AreaWords(List<WordResponse> wordList) {
  }

  private final ChatModel chatModel;
  private final WordIdService wordIdService;

  public List<WordResponse> getAreaWords(byte[] imageData) {
    var result = ChatClient.create(chatModel).prompt().system(
        """
            Please extract the wordlist data from this page?
            In response please provide all extracted words in JSON array with objects containing following properties: "word", "forms", "examples".
            The word property holds a string. it's the basic form of the word without any forms.
            The forms is a string array representing the different forms. In case of a noun it the plural form.
            In case of verb it's the 3 forms of conjugation (Eg. Du gehst, Er/Sie/Es geht, Er/Sie/Es ist gegangen). Please enhance it to make those full words. Not just endings.
            The examples property is a string array enlisting the examples provided in the document.
            json_structure:
            {
                word_list: [
                    {
                        "word": "das Haus",
                        "forms": ["die Häuser"],
                        "examples": ["Das Haus ist groß."]
                    },
                    {
                        "word": "gehen",
                        "forms": ["gehst", "geht", "ist gegangen"],
                        "examples": ["Ich gehe jetzt.", "Er ist nach Hause gegangen."]
                    }
                ]
            }
            """)
        .user(u -> u.text("Here is the image of the page").media(
            Media.builder().data(imageData).mimeType(MimeTypeUtils.IMAGE_PNG).build()))
        .call().entity(AreaWords.class);

    return result.wordList.stream().map(word -> {
      word.setId(wordIdService.generateWordId(word.getWord()));
      return word;
    }).toList();
  }
}
