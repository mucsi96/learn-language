package io.github.mucsi96.learnlanguage.model;

import java.time.Instant;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PendingPhotoStatusResponse {
  private boolean hasPending;
  private Instant createdAt;
  private Instant expiresAt;
}
