package io.github.mucsi96.learnlanguage.controller;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;

import jakarta.validation.Valid;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import io.github.mucsi96.learnlanguage.model.ImageGenerationJobStatus;
import io.github.mucsi96.learnlanguage.model.ImageGenerationResponse;
import io.github.mucsi96.learnlanguage.model.ImageJobStatusResponse;
import io.github.mucsi96.learnlanguage.model.ImageSourceRequest;
import io.github.mucsi96.learnlanguage.model.ModelType;
import io.github.mucsi96.learnlanguage.repository.ModelUsageLogRepository;
import io.github.mucsi96.learnlanguage.service.AsyncImageGenerationService;
import io.github.mucsi96.learnlanguage.service.FileStorageService;
import io.github.mucsi96.learnlanguage.service.ImageGenerationJobService;
import io.github.mucsi96.learnlanguage.service.RateLimitSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

@RestController
@RequiredArgsConstructor
public class ImageController {

  private final FileStorageService fileStorageService;
  private final AsyncImageGenerationService asyncImageGenerationService;
  private final ImageGenerationJobService imageGenerationJobService;
  private final RateLimitSettingService rateLimitSettingService;
  private final ModelUsageLogRepository modelUsageLogRepository;

  private static final String IMAGE_WEBP_VALUE = "image/webp";
  private static final MediaType IMAGE_WEBP = MediaType.parseMediaType(IMAGE_WEBP_VALUE);

  @PostMapping("/image")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ImageGenerationResponse createImage(@Valid @RequestBody ImageSourceRequest imageSource) {
    final int dailyLimit = rateLimitSettingService.getImageDailyLimit();
    if (dailyLimit > 0) {
      final long todayUsage = modelUsageLogRepository.countByModelTypeSince(
          ModelType.IMAGE, LocalDate.now(ZoneOffset.UTC).atStartOfDay());
      if (todayUsage >= dailyLimit) {
        throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
            "Daily image generation limit of " + dailyLimit + " reached");
      }
    }
    final String displayName = imageSource.getModel().getDisplayName();
    final UUID id = UUID.randomUUID();
    imageGenerationJobService.createPending(id, displayName);
    try {
      asyncImageGenerationService.generate(
          id, imageSource.getInput(), imageSource.getContext(), imageSource.getModel(), imageSource.isDescribe());
    } catch (TaskRejectedException e) {
      imageGenerationJobService.markFailed(id, "Image generation queue is full");
      throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
          "Image generation is busy, please retry");
    }
    return ImageGenerationResponse.builder()
        .id(id.toString())
        .model(displayName)
        .status(ImageGenerationJobStatus.PENDING)
        .build();
  }

  @GetMapping("/image/{id}/status")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ImageJobStatusResponse getImageStatus(@PathVariable String id) {
    final var job = imageGenerationJobService.getJob(parseId(id));
    return ImageJobStatusResponse.builder()
        .status(job.getStatus())
        .error(job.getError())
        .build();
  }

  private UUID parseId(String id) {
    try {
      return UUID.fromString(id);
    } catch (IllegalArgumentException e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid image id");
    }
  }

  @GetMapping(value = "/image/{id}", produces = IMAGE_WEBP_VALUE)
  @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
  public ResponseEntity<byte[]> getImage(@PathVariable String id) {
    final String filePath = "images/%s.webp".formatted(id);
    final byte[] data = fileStorageService.fetchFile(filePath).toBytes();
    return ResponseEntity.ok()
        .contentType(IMAGE_WEBP)
        .header("Cache-Control", "public, max-age=31536000, immutable")
        .body(data);
  }
}
