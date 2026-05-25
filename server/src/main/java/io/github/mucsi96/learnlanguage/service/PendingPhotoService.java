package io.github.mucsi96.learnlanguage.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.mucsi96.learnlanguage.entity.PendingPhoto;
import io.github.mucsi96.learnlanguage.entity.Source;
import io.github.mucsi96.learnlanguage.repository.PendingPhotoMetaProjection;
import io.github.mucsi96.learnlanguage.repository.PendingPhotoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class PendingPhotoService {

  static final Duration TTL = Duration.ofHours(24);

  private final PendingPhotoRepository pendingPhotoRepository;

  @Transactional
  public PendingPhoto upsert(String userId, Source source, byte[] bytes, String contentType) {
    pendingPhotoRepository.deleteByUserIdAndSource(userId, source);
    pendingPhotoRepository.flush();

    final Instant now = Instant.now();
    return pendingPhotoRepository.save(PendingPhoto.builder()
        .userId(userId)
        .source(source)
        .imageData(bytes)
        .contentType(contentType)
        .createdAt(now)
        .expiresAt(now.plus(TTL))
        .build());
  }

  @Transactional
  public Optional<PendingPhotoMetaProjection> getActiveMeta(String userId, Source source) {
    return pendingPhotoRepository.findMetaByUserIdAndSource(userId, source)
        .flatMap(meta -> {
          if (meta.getExpiresAt().isBefore(Instant.now())) {
            pendingPhotoRepository.deleteByIdSkippingLoad(meta.getId());
            return Optional.empty();
          }
          return Optional.of(meta);
        });
  }

  @Transactional
  public Optional<PendingPhoto> getActive(String userId, Source source) {
    return pendingPhotoRepository.findByUserIdAndSource(userId, source)
        .flatMap(photo -> {
          if (photo.getExpiresAt().isBefore(Instant.now())) {
            pendingPhotoRepository.delete(photo);
            return Optional.empty();
          }
          return Optional.of(photo);
        });
  }

  @Transactional
  public void discard(String userId, Source source) {
    pendingPhotoRepository.deleteByUserIdAndSource(userId, source);
  }

  @Transactional
  public void delete(PendingPhoto photo) {
    pendingPhotoRepository.delete(photo);
  }

  @Scheduled(fixedRate = 3_600_000L)
  @Transactional
  public void cleanupExpired() {
    final int removed = pendingPhotoRepository.deleteByExpiresAtBefore(Instant.now());
    if (removed > 0) {
      log.info("Cleaned up {} expired pending photo(s)", removed);
    }
  }
}
