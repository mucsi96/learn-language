package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ImageJobStatusResponse {
  private String status;

  @JsonInclude(Include.NON_NULL)
  private String error;
}
