package io.github.mucsi96.learnlanguage.service;

import java.util.Base64;
import java.util.List;

import org.springframework.stereotype.Service;

import com.openai.client.OpenAIClient;
import com.openai.models.ChatModel;
import com.openai.models.chat.completions.ChatCompletionContentPart;
import com.openai.models.chat.completions.ChatCompletionContentPartImage;
import com.openai.models.chat.completions.ChatCompletionContentPartText;
import com.openai.models.chat.completions.ChatCompletionCreateParams;

import io.github.mucsi96.learnlanguage.model.WordResponse;
import io.github.mucsi96.learnlanguage.tracing.AITracingRunType;
import io.github.mucsi96.learnlanguage.tracing.AITracingService;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AreaWordsService {

  static record AreaWords(List<WordResponse> wordList) {
  }

  private final OpenAIClient openAIClient;
  private final WordIdService wordIdService;
  private final AITracingService aiTracingService;

  public List<WordResponse> getAreaWords(byte[] imageData) {
    String imageBase64Url = "data:image/png;base64," + Base64.getEncoder().encodeToString(imageData);
    var imageContentPart = ChatCompletionContentPart.ofImageUrl(ChatCompletionContentPartImage.builder()
        .imageUrl(ChatCompletionContentPartImage.ImageUrl.builder()
            .url(imageBase64Url)
            .build())
        .build());
    var questionContentPart = ChatCompletionContentPart.ofText(ChatCompletionContentPartText.builder()
        .text("Here is the image of the page")
        .build());

    var createParams = ChatCompletionCreateParams.builder()
        .model(ChatModel.GPT_4_1)
        .addSystemMessage(
            """
                You are a linguistic expert.
                You task is to extract the wordlist data from provided page image.
                !IMPORTANT! In response please provide all extracted words in JSON array with objects containing following properties: "word", "forms", "examples".
                The word property holds a string. it's the basic form of the word without any forms.
                The forms is a string array representing the different forms. In case of a noun it the plural form.
                In case of verb it's the 3 forms of conjugation (Eg. Du gehst, Er/Sie/Es geht, Er/Sie/Es ist gegangen). Please enhance it to make those full words. Not just endings.
                The examples property is a string array enlisting the examples provided in the document.
                json_structure:
                {
                    wordList: [
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
        .addUserMessageOfArrayOfContentParts(List.of(questionContentPart, imageContentPart))
        .responseFormat(AreaWords.class)
        .build();

    var result = aiTracingService.traceRun(
        "Extract area words from image",
        AITracingRunType.llm,
        null,
        () -> openAIClient.chat().completions().create(createParams).choices().stream()
            .flatMap(choice -> choice.message().content().stream()).findFirst()
            .orElseThrow(() -> new RuntimeException("No content returned from OpenAI API")));

    return result.wordList.stream().map(word -> {
      word.setId(wordIdService.generateWordId(word.getWord()));
      return word;
    }).toList();
  }
}
