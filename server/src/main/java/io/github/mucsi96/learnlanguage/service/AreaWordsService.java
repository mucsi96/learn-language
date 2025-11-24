package io.github.mucsi96.learnlanguage.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.ImmutableMap;
import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Part;
import com.google.genai.types.Schema;
import com.google.genai.types.Type;

import io.github.mucsi96.learnlanguage.model.WordResponse;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AreaWordsService {

  private static final String GEMINI_MODEL = "gemini-3-pro-preview-11-2025";

  static record AreaWords(List<WordResponse> wordList) {
  }

  private final Client googleAiClient;
  private final WordIdService wordIdService;

  public List<WordResponse> getAreaWords(byte[] imageData) {
    Schema wordSchema = Schema.builder()
        .type(Type.Known.OBJECT)
        .properties(ImmutableMap.of(
            "word", Schema.builder().type(Type.Known.STRING).build(),
            "forms", Schema.builder()
                .type(Type.Known.ARRAY)
                .items(Schema.builder().type(Type.Known.STRING).build())
                .build(),
            "examples", Schema.builder()
                .type(Type.Known.ARRAY)
                .items(Schema.builder().type(Type.Known.STRING).build())
                .build()))
        .required("word", "forms", "examples")
        .build();

    Schema responseSchema = Schema.builder()
        .type(Type.Known.OBJECT)
        .properties(ImmutableMap.of(
            "wordList", Schema.builder()
                .type(Type.Known.ARRAY)
                .items(wordSchema)
                .build()))
        .required("wordList")
        .build();

    GenerateContentConfig config = GenerateContentConfig.builder()
        .responseMimeType("application/json")
        .candidateCount(1)
        .responseSchema(responseSchema)
        .systemInstruction(Content.builder()
            .role("user")
            .parts(Part.text("""
                You are a linguistic expert.
                You task is to extract the wordlist data from provided page image.
                !IMPORTANT! In response please provide all extracted words in JSON array with objects containing following properties: "word", "forms", "examples".
                The word property holds a string. it's the basic form of the word without any forms.
                The forms is a string array representing the different forms. In case of a noun it the plural form.
                In case of verb it's the 3 forms of conjugation (Eg. Du gehst, Er/Sie/Es geht, Er/Sie/Es ist gegangen). Please enhance it to make those full words. Not just endings.
                The examples property is a string array enlisting the examples provided in the document.
                Example of the expected JSON response:
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
                """))
            .build())
        .build();

    GenerateContentResponse response = googleAiClient.models.generateContent(
        GEMINI_MODEL,
        Content.fromParts(
            Part.text("Here is the image of the page"),
            Part.fromBytes(imageData, "image/png")),
        config);

    String responseText = response.text();

    try {
      var objectMapper = new ObjectMapper();
      var result = objectMapper.readValue(responseText, AreaWords.class);
      return result.wordList.stream().map(word -> {
        word.setId(wordIdService.generateWordId(word.getWord()));
        return word;
      }).toList();
    } catch (Exception e) {
      throw new RuntimeException("Failed to deserialize response from Gemini API: " + responseText, e);
    }
  }
}
