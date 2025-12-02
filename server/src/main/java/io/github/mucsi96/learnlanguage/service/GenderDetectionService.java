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
public class GenderDetectionService {

  private static final String GEMINI_MODEL = "gemini-3-pro-preview-11-2025";

  static record GenderResult(String gender) {
  }

  private final Client googleAiClient;

  public String detectGender(String noun) {
    Schema responseSchema = Schema.builder()
        .type(Type.Known.OBJECT)
        .properties(ImmutableMap.of(
            "gender", Schema.builder().type(Type.Known.STRING).build()))
        .required("gender")
        .build();

    GenerateContentConfig config = GenerateContentConfig.builder()
        .responseMimeType("application/json")
        .candidateCount(1)
        .responseSchema(responseSchema)
        .systemInstruction(Content.builder()
            .role("user")
            .parts(Part.text("""
                You are a German language expert.
                Your task is to determine the gender of the given German noun.
                Return the grammatical gender in capitalized form: MASCULINE, FEMININE, or NEUTER.
                Do not include any additional text or explanations, just the JSON response.
                Example of the expected JSON response:
                {
                    "gender": "MASCULINE"
                }
                """))
            .build())
        .build();

    GenerateContentResponse response = googleAiClient.models.generateContent(
        GEMINI_MODEL,
        "The noun is: %s.".formatted(noun),
        config);

    String responseText = response.text();

    try {
      var objectMapper = new ObjectMapper();
      var result = objectMapper.readValue(responseText, GenderResult.class);
      return result.gender();
    } catch (Exception e) {
      throw new RuntimeException("Failed to deserialize response from Gemini API: " + responseText, e);
    }
  }
}
