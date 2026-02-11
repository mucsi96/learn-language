package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchImageResultItem {
  private String customId;

  @JsonInclude(Include.NON_NULL)
  private ExampleImageData image;

  @JsonInclude(Include.NON_NULL)
  private String error;
}
