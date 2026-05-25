package io.github.mucsi96.learnlanguage.repository;

import java.time.Instant;
import java.util.UUID;

public interface PendingPhotoMetaProjection {
  UUID getId();

  Instant getCreatedAt();

  Instant getExpiresAt();
}
