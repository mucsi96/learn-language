package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Builder;
import lombok.Data;
import lombok.extern.jackson.Jacksonized;

@Data
@Builder
@Jacksonized
public class ElevenLabsTextToSpeechRequest {

  String text;

  @JsonProperty("model_id")
  String modelId;

  @JsonProperty("voice_settings")
  ElevenLabsVoiceSettings voiceSettings;

  @JsonProperty("language_code")
  String languageCode;
}
