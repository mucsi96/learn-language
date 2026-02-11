package io.github.mucsi96.learnlanguage.model;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchImageRequest {
  @NotEmpty
  @Valid
  private List<BatchImageRequestItem> requests;
}
