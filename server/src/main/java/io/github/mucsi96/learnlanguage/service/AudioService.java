package io.github.mucsi96.learnlanguage.service;

import java.io.IOException;
import java.util.List;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.model.AudioModelResponse;
import io.github.mucsi96.learnlanguage.model.ModelProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AudioService {

  private static final List<AudioModelResponse> AVAILABLE_MODELS = List.of(
      AudioModelResponse.builder()
          .id("eleven_v3")
          .displayName("Eleven v3")
          .isDefault(true)
          .provider(ModelProvider.ELEVENLABS)
          .build(),
      AudioModelResponse.builder()
          .id("eleven_turbo_v2_5")
          .displayName("Eleven Turbo v2.5")
          .isDefault(false)
          .provider(ModelProvider.ELEVENLABS)
          .build(),
      AudioModelResponse.builder()
          .id(GeminiAudioService.MODEL_NAME)
          .displayName("Gemini 3.1 Flash TTS")
          .isDefault(false)
          .provider(ModelProvider.GOOGLE)
          .build()
  );

  private final ElevenLabsAudioService elevenLabsAudioService;
  private final GeminiAudioService geminiAudioService;

  public byte[] generateAudio(String input, String voiceName, String model, String language, String context, boolean singleWord) throws IOException {
    if ("eleven_turbo_v2_5".equals(model) || "eleven_v3".equals(model)) {
      return elevenLabsAudioService.generateAudio(input, voiceName, model, language, context, singleWord);
    } else if (GeminiAudioService.MODEL_NAME.equals(model)) {
      return geminiAudioService.generateAudio(input, voiceName, language, singleWord);
    } else {
      throw new IllegalArgumentException("Unsupported audio model: " + model);
    }
  }

  public List<AudioModelResponse> getAvailableModels() {
    return AVAILABLE_MODELS;
  }
}
