package io.github.mucsi96.learnlanguage.service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openai.client.OpenAIClient;
import com.openai.core.http.HttpResponse;
import com.openai.models.batches.BatchCreateParams;
import com.openai.models.batches.Batch;
import com.openai.models.files.FileCreateParams;
import com.openai.models.files.FileObject;
import com.openai.models.files.FilePurpose;

import io.github.mucsi96.learnlanguage.model.BatchImageRequestItem;
import io.github.mucsi96.learnlanguage.model.OperationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class OpenAIBatchImageService {

  private final OpenAIClient openAIClient;
  private final ModelUsageLoggingService usageLoggingService;
  private final ObjectMapper objectMapper;

  public record ProviderBatchResult(String customId, byte[] imageBytes, String modelDisplayName, String error) {
  }

  public String submitBatch(List<BatchImageRequestItem> items) {
    final long startTime = System.currentTimeMillis();
    try {
      final String jsonlContent = items.stream()
          .map(this::buildJsonlLine)
          .collect(Collectors.joining("\n"));

      final FileObject file = openAIClient.files().create(
          FileCreateParams.builder()
              .purpose(FilePurpose.BATCH)
              .file(jsonlContent.getBytes(StandardCharsets.UTF_8))
              .build());

      final Batch batch = openAIClient.batches().create(
          BatchCreateParams.builder()
              .inputFileId(file.id())
              .endpoint(BatchCreateParams.Endpoint.V1_RESPONSES)
              .completionWindow(BatchCreateParams.CompletionWindow._24H)
              .build());

      final long processingTime = System.currentTimeMillis() - startTime;
      log.info("OpenAI batch submitted: id={}, items={}, time={}ms",
          batch.id(), items.size(), processingTime);

      return batch.id();
    } catch (Exception e) {
      log.error("Failed to submit OpenAI batch", e);
      throw new RuntimeException("Failed to submit OpenAI batch: " + e.getMessage(), e);
    }
  }

  public boolean isBatchComplete(String batchId) {
    final Batch batch = openAIClient.batches().retrieve(batchId);
    final String status = batch.status().toString();
    return "completed".equals(status) || "failed".equals(status) || "expired".equals(status)
        || "cancelled".equals(status);
  }

  public String getBatchStatus(String batchId) {
    return openAIClient.batches().retrieve(batchId).status().toString();
  }

  public List<ProviderBatchResult> getBatchResults(String batchId,
      Map<String, BatchImageRequestItem> requestMap) {
    final long startTime = System.currentTimeMillis();
    try {
      final Batch batch = openAIClient.batches().retrieve(batchId);
      final String outputFileId = batch.outputFileId().orElseThrow(
          () -> new RuntimeException("Batch has no output file"));

      final HttpResponse response = openAIClient.files().content(outputFileId);
      final String content = new BufferedReader(
          new InputStreamReader(response.body(), StandardCharsets.UTF_8))
          .lines()
          .collect(Collectors.joining("\n"));
      response.close();

      final long processingTime = System.currentTimeMillis() - startTime;

      return new BufferedReader(new StringReader(content)).lines()
          .map(line -> parseResultLine(line, requestMap, processingTime))
          .toList();
    } catch (Exception e) {
      log.error("Failed to get OpenAI batch results", e);
      throw new RuntimeException("Failed to get OpenAI batch results: " + e.getMessage(), e);
    }
  }

  private String buildJsonlLine(BatchImageRequestItem item) {
    try {
      final String modelName = item.getModel().getModelName();
      final Map<String, Object> toolConfig = Map.of(
          "type", "image_generation",
          "model", modelName,
          "size", "1024x1024",
          "quality", "high",
          "output_format", "jpeg",
          "output_compression", 75);

      final Map<String, Object> body = Map.of(
          "model", "gpt-4.1-mini",
          "input",
          "Create a photorealistic image for the following context: " + item.getInput() + ". Avoid using text.",
          "tools", List.of(toolConfig));

      final Map<String, Object> request = Map.of(
          "custom_id", item.getCustomId(),
          "method", "POST",
          "url", "/v1/responses",
          "body", body);

      return objectMapper.writeValueAsString(request);
    } catch (Exception e) {
      throw new RuntimeException("Failed to build JSONL line", e);
    }
  }

  private ProviderBatchResult parseResultLine(String line, Map<String, BatchImageRequestItem> requestMap,
      long processingTime) {
    try {
      final JsonNode root = objectMapper.readTree(line);
      final String customId = root.get("custom_id").asText();
      final BatchImageRequestItem originalRequest = requestMap.get(customId);

      final JsonNode error = root.get("error");
      if (error != null && !error.isNull()) {
        return new ProviderBatchResult(customId, null, null, error.toString());
      }

      final JsonNode responseBody = root.get("response").get("body");
      final JsonNode output = responseBody.get("output");

      for (final JsonNode outputItem : output) {
        if ("image_generation_call".equals(outputItem.get("type").asText())) {
          final String b64Image = outputItem.get("result").asText();
          final byte[] imageBytes = Base64.getDecoder().decode(b64Image);
          final String modelDisplayName = originalRequest != null
              ? originalRequest.getModel().getDisplayName()
              : null;

          if (originalRequest != null) {
            usageLoggingService.logImageUsage(
                originalRequest.getModel().getModelName(),
                OperationType.IMAGE_GENERATION,
                1,
                processingTime);
          }

          return new ProviderBatchResult(customId, imageBytes, modelDisplayName, null);
        }
      }

      return new ProviderBatchResult(customId, null, null, "No image found in response");
    } catch (Exception e) {
      log.error("Failed to parse result line", e);
      return new ProviderBatchResult("unknown", null, null, "Parse error: " + e.getMessage());
    }
  }
}
