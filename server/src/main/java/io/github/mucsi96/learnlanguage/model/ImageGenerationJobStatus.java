package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonValue;

public enum ImageGenerationJobStatus {
  PENDING,
  COMPLETED,
  FAILED;

  @JsonValue
  public String toJson() {
    return name().toLowerCase();
  }
}
