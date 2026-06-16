package io.github.mucsi96.learnlanguage.service;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import io.github.mucsi96.learnlanguage.entity.ImageGenerationJob;
import io.github.mucsi96.learnlanguage.model.ImageGenerationJobStatus;
import io.github.mucsi96.learnlanguage.repository.ImageGenerationJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImageGenerationJobService {

  static final Duration TTL = Duration.ofHours(1);

  private final ImageGenerationJobRepository imageGenerationJobRepository;

  @Transactional
  public ImageGenerationJob createPending(UUID id, String model) {
    return imageGenerationJobRepository.save(ImageGenerationJob.builder()
        .id(id)
        .status(ImageGenerationJobStatus.PENDING)
        .model(model)
        .createdAt(Instant.now())
        .build());
  }

  @Transactional
  public void markCompleted(UUID id) {
    imageGenerationJobRepository.updateStatus(id, ImageGenerationJobStatus.COMPLETED, null);
  }

  @Transactional
  public void markFailed(UUID id, String error) {
    imageGenerationJobRepository.updateStatus(id, ImageGenerationJobStatus.FAILED, error);
  }

  @Transactional(readOnly = true)
  public ImageGenerationJob getJob(UUID id) {
    return imageGenerationJobRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Image generation job not found"));
  }

  @Scheduled(fixedRate = 3_600_000L)
  @Transactional
  public void cleanupOld() {
    final int removed = imageGenerationJobRepository.deleteByCreatedAtBefore(Instant.now().minus(TTL));
    if (removed > 0) {
      log.info("Cleaned up {} old image generation job(s)", removed);
    }
  }
}
