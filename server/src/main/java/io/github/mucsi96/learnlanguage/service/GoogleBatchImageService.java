package io.github.mucsi96.learnlanguage.service;

import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import org.springframework.stereotype.Service;

import com.google.genai.Client;
import com.google.genai.types.BatchJob;
import com.google.genai.types.BatchJobSource;
import com.google.genai.types.Content;
import com.google.genai.types.CreateBatchJobConfig;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.ImageConfig;
import com.google.genai.types.InlinedRequest;
import com.google.genai.types.InlinedResponse;
import com.google.genai.types.JobState;
import com.google.genai.types.Part;

import io.github.mucsi96.learnlanguage.model.BatchImageRequestItem;
import io.github.mucsi96.learnlanguage.model.OperationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleBatchImageService {

  private static final String GEMINI_MODEL = "gemini-3-pro-image-preview";

  private final Client googleAiClient;
  private final ModelUsageLoggingService usageLoggingService;

  public record ProviderBatchResult(String customId, byte[] imageBytes, String modelDisplayName, String error) {
  }

  public String submitBatch(List<BatchImageRequestItem> items) {
    final long startTime = System.currentTimeMillis();
    try {
      final List<InlinedRequest> inlinedRequests = items.stream()
          .map(this::buildInlinedRequest)
          .toList();

      final BatchJobSource source = BatchJobSource.builder()
          .inlinedRequests(inlinedRequests)
          .build();

      final BatchJob batchJob = googleAiClient.batches.create(
          GEMINI_MODEL,
          source,
          CreateBatchJobConfig.builder()
              .displayName("image-generation-batch")
              .build());

      final String batchName = batchJob.name().orElseThrow(
          () -> new RuntimeException("Batch job has no name"));

      final long processingTime = System.currentTimeMillis() - startTime;
      log.info("Google batch submitted: name={}, items={}, time={}ms",
          batchName, items.size(), processingTime);

      return batchName;
    } catch (Exception e) {
      log.error("Failed to submit Google batch", e);
      throw new RuntimeException("Failed to submit Google batch: " + e.getMessage(), e);
    }
  }

  public boolean isBatchComplete(String batchName) {
    try {
      final BatchJob job = googleAiClient.batches.get(batchName, null);
      final JobState state = job.state().orElse(null);
      if (state == null) {
        return false;
      }
      final String stateName = state.toString();
      return "JOB_STATE_SUCCEEDED".equals(stateName)
          || "JOB_STATE_FAILED".equals(stateName)
          || "JOB_STATE_CANCELLED".equals(stateName)
          || "JOB_STATE_PARTIALLY_SUCCEEDED".equals(stateName);
    } catch (Exception e) {
      log.error("Failed to get Google batch status", e);
      return false;
    }
  }

  public String getBatchStatus(String batchName) {
    try {
      final BatchJob job = googleAiClient.batches.get(batchName, null);
      return job.state().map(JobState::toString).orElse("UNKNOWN");
    } catch (Exception e) {
      log.error("Failed to get Google batch status", e);
      return "UNKNOWN";
    }
  }

  public List<ProviderBatchResult> getBatchResults(String batchName,
      List<BatchImageRequestItem> originalItems) {
    final long startTime = System.currentTimeMillis();
    try {
      final BatchJob job = googleAiClient.batches.get(batchName, null);
      final List<InlinedResponse> responses = job.dest()
          .flatMap(dest -> dest.inlinedResponses())
          .orElseThrow(() -> new RuntimeException("No inlined responses in batch job"));

      final long processingTime = System.currentTimeMillis() - startTime;

      return IntStream.range(0, Math.min(responses.size(), originalItems.size()))
          .mapToObj(i -> parseInlinedResponse(responses.get(i), originalItems.get(i), processingTime))
          .toList();
    } catch (Exception e) {
      log.error("Failed to get Google batch results", e);
      throw new RuntimeException("Failed to get Google batch results: " + e.getMessage(), e);
    }
  }

  private InlinedRequest buildInlinedRequest(BatchImageRequestItem item) {
    final Content content = Content.builder()
        .parts(List.of(
            Part.builder()
                .text(item.getInput() + ". Avoid using text.")
                .build()))
        .build();

    final GenerateContentConfig config = GenerateContentConfig.builder()
        .responseModalities("TEXT", "IMAGE")
        .imageConfig(ImageConfig.builder()
            .aspectRatio("1:1")
            .imageSize("1K")
            .build())
        .build();

    return InlinedRequest.builder()
        .contents(content)
        .config(config)
        .metadata(Map.of("customId", item.getCustomId()))
        .build();
  }

  private ProviderBatchResult parseInlinedResponse(InlinedResponse inlinedResponse,
      BatchImageRequestItem originalItem, long processingTime) {
    final String customId = originalItem.getCustomId();
    try {
      if (inlinedResponse.error().isPresent()) {
        return new ProviderBatchResult(customId, null, null,
            inlinedResponse.error().get().toString());
      }

      final var generateResponse = inlinedResponse.response().orElseThrow(
          () -> new RuntimeException("No response in inlined response"));

      final var candidates = generateResponse.candidates()
          .orElseThrow(() -> new RuntimeException("No candidates"));

      if (candidates.isEmpty()) {
        return new ProviderBatchResult(customId, null, null, "No candidates in response");
      }

      final var parts = candidates.get(0).content()
          .flatMap(c -> c.parts())
          .orElseThrow(() -> new RuntimeException("No parts in response"));

      for (final Part part : parts) {
        if (part.inlineData().isPresent()) {
          final byte[] imageBytes = part.inlineData().get().data()
              .orElseThrow(() -> new RuntimeException("No data in inline data"));

          usageLoggingService.logImageUsage(
              GEMINI_MODEL,
              OperationType.IMAGE_GENERATION,
              1,
              processingTime);

          return new ProviderBatchResult(customId, imageBytes,
              originalItem.getModel().getDisplayName(), null);
        }
      }

      return new ProviderBatchResult(customId, null, null, "No image found in response");
    } catch (Exception e) {
      log.error("Failed to parse Google batch result for customId={}", customId, e);
      return new ProviderBatchResult(customId, null, null, "Parse error: " + e.getMessage());
    }
  }
}
