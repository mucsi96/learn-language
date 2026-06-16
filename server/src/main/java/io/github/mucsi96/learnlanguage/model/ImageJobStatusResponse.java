package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ImageJobStatusResponse {
  private ImageGenerationJobStatus status;

  @JsonInclude(Include.NON_NULL)
  private String error;

  @JsonInclude(Include.NON_NULL)
  private String description;
}
