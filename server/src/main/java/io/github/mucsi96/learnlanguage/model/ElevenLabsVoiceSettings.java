package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Builder;
import lombok.Data;
import lombok.extern.jackson.Jacksonized;

@Data
@Builder
@Jacksonized
public class ElevenLabsVoiceSettings {

  Double stability;

  @JsonProperty("similarity_boost")
  Double similarityBoost;
}
