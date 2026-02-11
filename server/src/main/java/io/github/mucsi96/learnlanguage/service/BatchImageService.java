package io.github.mucsi96.learnlanguage.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;

import com.azure.core.util.BinaryData;

import io.github.mucsi96.learnlanguage.model.BatchImageJobResponse;
import io.github.mucsi96.learnlanguage.model.BatchImageRequest;
import io.github.mucsi96.learnlanguage.model.BatchImageRequestItem;
import io.github.mucsi96.learnlanguage.model.BatchImageResultItem;
import io.github.mucsi96.learnlanguage.model.BatchImageStatusResponse;
import io.github.mucsi96.learnlanguage.model.ExampleImageData;
import io.github.mucsi96.learnlanguage.model.ImageGenerationModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class BatchImageService {

  private final OpenAIBatchImageService openAIBatchImageService;
  private final GoogleBatchImageService googleBatchImageService;
  private final GoogleImageService googleImageService;
  private final FileStorageService fileStorageService;

  private final ConcurrentHashMap<String, BatchMetadata> batchStore = new ConcurrentHashMap<>();

  private record BatchMetadata(
      String openAiBatchId,
      String googleBatchName,
      List<BatchImageRequestItem> openAiItems,
      List<BatchImageRequestItem> googleGeminiItems,
      List<BatchImageRequestItem> imagenItems,
      List<BatchImageResultItem> completedResults) {
  }

  public BatchImageJobResponse createBatch(BatchImageRequest request) {
    final String batchId = UUID.randomUUID().toString();
    final List<BatchImageRequestItem> items = request.getRequests();

    final Map<Boolean, List<BatchImageRequestItem>> partitioned = items.stream()
        .collect(Collectors.partitioningBy(
            item -> item.getModel() == ImageGenerationModel.GPT_IMAGE_1
                || item.getModel() == ImageGenerationModel.GPT_IMAGE_1_5));

    final List<BatchImageRequestItem> openAiItems = partitioned.get(true);
    final List<BatchImageRequestItem> nonOpenAiItems = partitioned.get(false);

    final List<BatchImageRequestItem> googleGeminiItems = nonOpenAiItems.stream()
        .filter(item -> item.getModel() == ImageGenerationModel.GEMINI_3_PRO_IMAGE_PREVIEW)
        .toList();

    final List<BatchImageRequestItem> imagenItems = nonOpenAiItems.stream()
        .filter(item -> item.getModel() == ImageGenerationModel.IMAGEN_4_ULTRA)
        .toList();

    String openAiBatchId = null;
    String googleBatchName = null;
    final List<BatchImageResultItem> completedResults = new ArrayList<>();

    if (!openAiItems.isEmpty()) {
      openAiBatchId = openAIBatchImageService.submitBatch(openAiItems);
    }

    if (!googleGeminiItems.isEmpty()) {
      googleBatchName = googleBatchImageService.submitBatch(googleGeminiItems);
    }

    if (!imagenItems.isEmpty()) {
      final List<BatchImageResultItem> imagenResults = imagenItems.stream()
          .map(this::processImagenSynchronously)
          .toList();
      completedResults.addAll(imagenResults);
    }

    batchStore.put(batchId, new BatchMetadata(
        openAiBatchId,
        googleBatchName,
        openAiItems,
        googleGeminiItems,
        imagenItems,
        completedResults));

    log.info("Batch created: id={}, openAi={}, google={}, imagen={}",
        batchId,
        openAiItems.size(),
        googleGeminiItems.size(),
        imagenItems.size());

    return BatchImageJobResponse.builder().batchId(batchId).build();
  }

  public BatchImageStatusResponse getBatchStatus(String batchId) {
    final BatchMetadata metadata = batchStore.get(batchId);
    if (metadata == null) {
      throw new RuntimeException("Batch not found: " + batchId);
    }

    final boolean openAiComplete = metadata.openAiBatchId == null
        || openAIBatchImageService.isBatchComplete(metadata.openAiBatchId);
    final boolean googleComplete = metadata.googleBatchName == null
        || googleBatchImageService.isBatchComplete(metadata.googleBatchName);

    if (!openAiComplete || !googleComplete) {
      return BatchImageStatusResponse.builder()
          .status("processing")
          .build();
    }

    final List<BatchImageResultItem> allResults = collectResults(metadata);

    batchStore.remove(batchId);

    return BatchImageStatusResponse.builder()
        .status("completed")
        .results(allResults)
        .build();
  }

  private List<BatchImageResultItem> collectResults(BatchMetadata metadata) {
    final List<BatchImageResultItem> allResults = new ArrayList<>(metadata.completedResults);

    if (metadata.openAiBatchId != null) {
      final Map<String, BatchImageRequestItem> openAiRequestMap = metadata.openAiItems.stream()
          .collect(Collectors.toMap(BatchImageRequestItem::getCustomId, item -> item));

      final List<OpenAIBatchImageService.ProviderBatchResult> openAiResults = openAIBatchImageService
          .getBatchResults(metadata.openAiBatchId, openAiRequestMap);

      openAiResults.stream()
          .map(this::saveAndConvert)
          .forEach(allResults::add);
    }

    if (metadata.googleBatchName != null) {
      final List<GoogleBatchImageService.ProviderBatchResult> googleResults = googleBatchImageService
          .getBatchResults(metadata.googleBatchName, metadata.googleGeminiItems);

      googleResults.stream()
          .map(this::saveAndConvert)
          .forEach(allResults::add);
    }

    return allResults;
  }

  private BatchImageResultItem saveAndConvert(OpenAIBatchImageService.ProviderBatchResult result) {
    if (result.imageBytes() == null) {
      return BatchImageResultItem.builder()
          .customId(result.customId())
          .error(result.error())
          .build();
    }

    final String uuid = UUID.randomUUID().toString();
    final String filePath = "images/%s.jpg".formatted(uuid);
    fileStorageService.saveFile(BinaryData.fromBytes(result.imageBytes()), filePath);

    return BatchImageResultItem.builder()
        .customId(result.customId())
        .image(ExampleImageData.builder()
            .id(uuid)
            .model(result.modelDisplayName())
            .build())
        .build();
  }

  private BatchImageResultItem saveAndConvert(GoogleBatchImageService.ProviderBatchResult result) {
    if (result.imageBytes() == null) {
      return BatchImageResultItem.builder()
          .customId(result.customId())
          .error(result.error())
          .build();
    }

    final String uuid = UUID.randomUUID().toString();
    final String filePath = "images/%s.jpg".formatted(uuid);
    fileStorageService.saveFile(BinaryData.fromBytes(result.imageBytes()), filePath);

    return BatchImageResultItem.builder()
        .customId(result.customId())
        .image(ExampleImageData.builder()
            .id(uuid)
            .model(result.modelDisplayName())
            .build())
        .build();
  }

  private BatchImageResultItem processImagenSynchronously(BatchImageRequestItem item) {
    try {
      final byte[] imageBytes = googleImageService.generateImageWithImagen(item.getInput());
      final String uuid = UUID.randomUUID().toString();
      final String filePath = "images/%s.jpg".formatted(uuid);
      fileStorageService.saveFile(BinaryData.fromBytes(imageBytes), filePath);

      return BatchImageResultItem.builder()
          .customId(item.getCustomId())
          .image(ExampleImageData.builder()
              .id(uuid)
              .model(item.getModel().getDisplayName())
              .build())
          .build();
    } catch (Exception e) {
      log.error("Failed to generate Imagen image for customId={}", item.getCustomId(), e);
      return BatchImageResultItem.builder()
          .customId(item.getCustomId())
          .error("Imagen generation failed: " + e.getMessage())
          .build();
    }
  }
}
