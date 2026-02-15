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
public class AudioSourceRequest {
  @NotNull
  private String input;
  @NotNull
  private String voice;
  @NotNull
  private String model;
  private String language;
  private Boolean selected;
  private String context;
  private Boolean singleWord;
}
