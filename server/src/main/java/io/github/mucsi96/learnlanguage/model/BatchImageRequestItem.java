package io.github.mucsi96.learnlanguage.model;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchImageRequestItem {
  @NotNull
  private String customId;

  @NotNull
  private String input;

  @NotNull
  private ImageGenerationModel model;
}
