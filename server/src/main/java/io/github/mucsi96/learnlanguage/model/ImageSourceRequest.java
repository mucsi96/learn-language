package io.github.mucsi96.learnlanguage.model;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImageSourceRequest {
  @NotNull
  private String input;

  @NotNull
  private ImageGenerationModel model;

  @Size(max = 500)
  private String context;
}
