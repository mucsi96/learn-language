package io.github.mucsi96.learnlanguage.service;

import java.util.List;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.function.Supplier;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Part;
import com.google.genai.types.Schema;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class GeminiComparisonService {

  private static final String GEMINI_MODEL = "gemini-3-pro-preview";

  private final Client googleAiClient;
  private final ObjectMapper objectMapper = new ObjectMapper();

  public <T> T executeWithComparison(
      String operationName,
      Supplier<T> openAiCall,
      String systemPrompt,
      String userPrompt,
      Class<T> responseType) {

    CompletableFuture<T> openAiFuture = CompletableFuture.supplyAsync(openAiCall);
    CompletableFuture<T> geminiFuture = CompletableFuture.supplyAsync(() ->
        callGemini(systemPrompt, userPrompt, responseType));

    T openAiResult = openAiFuture.join();

    try {
      T geminiResult = geminiFuture.join();
      compareAndPrintDifferences(operationName, openAiResult, geminiResult);
    } catch (Exception e) {
      System.out.println("[GEMINI COMPARISON] " + operationName + " - Gemini call failed: " + e.getMessage());
    }

    return openAiResult;
  }

  public <T> T executeWithComparisonMultimodal(
      String operationName,
      Supplier<T> openAiCall,
      String systemPrompt,
      String userPrompt,
      byte[] imageData,
      Class<T> responseType) {

    CompletableFuture<T> openAiFuture = CompletableFuture.supplyAsync(openAiCall);
    CompletableFuture<T> geminiFuture = CompletableFuture.supplyAsync(() ->
        callGeminiWithImage(systemPrompt, userPrompt, imageData, responseType));

    T openAiResult = openAiFuture.join();

    try {
      T geminiResult = geminiFuture.join();
      compareAndPrintDifferences(operationName, openAiResult, geminiResult);
    } catch (Exception e) {
      System.out.println("[GEMINI COMPARISON] " + operationName + " - Gemini call failed: " + e.getMessage());
    }

    return openAiResult;
  }

  private <T> T callGemini(String systemPrompt, String userPrompt, Class<T> responseType) {
    try {
      Schema responseSchema = buildSchemaForClass(responseType);

      GenerateContentConfig config = GenerateContentConfig.builder()
          .systemInstruction(Content.builder()
              .parts(List.of(Part.builder().text(systemPrompt).build()))
              .build())
          .responseMimeType("application/json")
          .responseSchema(responseSchema)
          .build();

      GenerateContentResponse response = googleAiClient.models.generateContent(
          GEMINI_MODEL,
          userPrompt,
          config);

      String jsonResponse = extractTextFromResponse(response);
      return objectMapper.readValue(jsonResponse, responseType);
    } catch (Exception e) {
      throw new RuntimeException("Gemini API call failed: " + e.getMessage(), e);
    }
  }

  private <T> T callGeminiWithImage(String systemPrompt, String userPrompt, byte[] imageData, Class<T> responseType) {
    try {
      Schema responseSchema = buildSchemaForClass(responseType);

      GenerateContentConfig config = GenerateContentConfig.builder()
          .systemInstruction(Content.builder()
              .parts(List.of(Part.builder().text(systemPrompt).build()))
              .build())
          .responseMimeType("application/json")
          .responseSchema(responseSchema)
          .build();

      Content userContent = Content.builder()
          .role("user")
          .parts(List.of(
              Part.builder().text(userPrompt).build(),
              Part.fromImageBytes(imageData, "image/png")
          ))
          .build();

      GenerateContentResponse response = googleAiClient.models.generateContent(
          GEMINI_MODEL,
          List.of(userContent),
          config);

      String jsonResponse = extractTextFromResponse(response);
      return objectMapper.readValue(jsonResponse, responseType);
    } catch (Exception e) {
      throw new RuntimeException("Gemini API call with image failed: " + e.getMessage(), e);
    }
  }

  private String extractTextFromResponse(GenerateContentResponse response) {
    if (response.candidates().isEmpty() || response.candidates().get().isEmpty()) {
      throw new RuntimeException("No response from Gemini API");
    }

    return response.candidates().get().get(0).content().get().parts().get().stream()
        .filter(part -> part.text().isPresent())
        .map(part -> part.text().get())
        .findFirst()
        .orElseThrow(() -> new RuntimeException("No text content in Gemini response"));
  }

  private <T> Schema buildSchemaForClass(Class<T> responseType) {
    if (responseType.getSimpleName().equals("GenderResult")) {
      return Schema.builder()
          .type("OBJECT")
          .properties(java.util.Map.of(
              "gender", Schema.builder().type("STRING").build()
          ))
          .required(List.of("gender"))
          .build();
    } else if (responseType.getSimpleName().equals("WordTypeResult")) {
      return Schema.builder()
          .type("OBJECT")
          .properties(java.util.Map.of(
              "type", Schema.builder().type("STRING").build()
          ))
          .required(List.of("type"))
          .build();
    } else if (responseType.getSimpleName().equals("TranslationResponse")) {
      return Schema.builder()
          .type("OBJECT")
          .properties(java.util.Map.of(
              "translation", Schema.builder().type("STRING").build(),
              "examples", Schema.builder()
                  .type("ARRAY")
                  .items(Schema.builder().type("STRING").build())
                  .build()
          ))
          .required(List.of("translation", "examples"))
          .build();
    } else if (responseType.getSimpleName().equals("AreaWords")) {
      return Schema.builder()
          .type("OBJECT")
          .properties(java.util.Map.of(
              "wordList", Schema.builder()
                  .type("ARRAY")
                  .items(Schema.builder()
                      .type("OBJECT")
                      .properties(java.util.Map.of(
                          "word", Schema.builder().type("STRING").build(),
                          "forms", Schema.builder()
                              .type("ARRAY")
                              .items(Schema.builder().type("STRING").build())
                              .build(),
                          "examples", Schema.builder()
                              .type("ARRAY")
                              .items(Schema.builder().type("STRING").build())
                              .build()
                      ))
                      .required(List.of("word"))
                      .build())
                  .build()
          ))
          .required(List.of("wordList"))
          .build();
    }

    return Schema.builder().type("OBJECT").build();
  }

  private <T> void compareAndPrintDifferences(String operationName, T openAiResult, T geminiResult) {
    try {
      String openAiJson = objectMapper.writeValueAsString(openAiResult);
      String geminiJson = objectMapper.writeValueAsString(geminiResult);

      if (!Objects.equals(openAiJson, geminiJson)) {
        System.out.println("\n========================================");
        System.out.println("[GEMINI COMPARISON] Difference detected in: " + operationName);
        System.out.println("----------------------------------------");
        System.out.println("OpenAI result:");
        System.out.println(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(openAiResult));
        System.out.println("----------------------------------------");
        System.out.println("Gemini result:");
        System.out.println(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(geminiResult));
        System.out.println("========================================\n");
      } else {
        System.out.println("[GEMINI COMPARISON] " + operationName + " - Results match");
      }
    } catch (Exception e) {
      System.out.println("[GEMINI COMPARISON] " + operationName + " - Error comparing results: " + e.getMessage());
    }
  }
}
