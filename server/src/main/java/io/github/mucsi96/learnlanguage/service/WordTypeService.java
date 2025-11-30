package io.github.mucsi96.learnlanguage.service;

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

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WordTypeService {

  private static final String GEMINI_MODEL = "gemini-3-pro-preview-11-2025";

  static record WordTypeResult(String type) {
  }

  private final Client googleAiClient;

  public String detectWordType(String word) {
    Schema responseSchema = Schema.builder()
        .type(Type.Known.OBJECT)
        .properties(ImmutableMap.of(
            "type", Schema.builder().type(Type.Known.STRING).build()))
        .required("type")
        .build();

    GenerateContentConfig config = GenerateContentConfig.builder()
        .responseMimeType("application/json")
        .candidateCount(1)
        .responseSchema(responseSchema)
        .systemInstruction(Content.builder()
            .role("user")
            .parts(Part.text("""
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
                Do not include any additional text or explanations, just the JSON response.
                Example of the expected JSON response:
                {
                    "type": "NOUN"
                }
                """))
            .build())
        .build();

    GenerateContentResponse response = googleAiClient.models.generateContent(
        GEMINI_MODEL,
        "The word is: %s.".formatted(word),
        config);

    String responseText = response.text();

    try {
      var objectMapper = new ObjectMapper();
      var result = objectMapper.readValue(responseText, WordTypeResult.class);
      return result.type();
    } catch (Exception e) {
      throw new RuntimeException("Failed to deserialize response from Gemini API: " + responseText, e);
    }
  }
}
