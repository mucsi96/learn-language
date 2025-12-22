package io.github.mucsi96.learnlanguage.service;

import org.springframework.ai.audio.tts.TextToSpeechPrompt;
import org.springframework.ai.elevenlabs.ElevenLabsTextToSpeechModel;
import org.springframework.ai.elevenlabs.ElevenLabsTextToSpeechOptions;
import org.springframework.ai.elevenlabs.api.ElevenLabsVoicesApi;
import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.model.LanguageResponse;
import io.github.mucsi96.learnlanguage.model.VoiceResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class ElevenLabsAudioService {

  private final ElevenLabsTextToSpeechModel textToSpeechModel;
  private final ElevenLabsVoicesApi voicesApi;
  private final ModelUsageLoggingService usageLoggingService;

  public byte[] generateAudio(String input, String voiceId, String language) {
    long startTime = System.currentTimeMillis();
    try {
      var speechOptions = ElevenLabsTextToSpeechOptions.builder()
          .voiceId(voiceId)
          .languageCode(language)
          .build();

      var speechPrompt = new TextToSpeechPrompt(input, speechOptions);

      byte[] result = textToSpeechModel.call(speechPrompt).getResult().getOutput();

      long processingTime = System.currentTimeMillis() - startTime;
      usageLoggingService.logAudioUsage("eleven_turbo_v2_5", "audio_generation", input.length(), processingTime);

      return result;

    } catch (Exception e) {
      log.error("Failed to generate audio with Eleven Labs", e);
      throw new RuntimeException("Failed to generate audio with Eleven Labs: " + e.getMessage(), e);
    }
  }

  public List<VoiceResponse> getVoices() {
    try {
      var response = voicesApi.getVoices();

      if (response.getBody() == null || response.getBody().voices() == null) {
        throw new RuntimeException("No voices returned from Eleven Labs API");
      }

      return response.getBody().voices().stream()
          .filter(voice -> voice.sharing() != null
              && ElevenLabsVoicesApi.VoiceSharing.StatusEnum.COPIED.equals(voice.sharing().status()))
          .map(voice -> VoiceResponse.builder()
              .id(voice.voiceId())
              .displayName(voice.name())
              .languages(Stream.concat(
                  voice.verifiedLanguages() != null ? voice.verifiedLanguages().stream()
                      .map(lang -> LanguageResponse.builder()
                          .name(lang.language())
                          .build())
                      : Stream.empty(),
                  extractLanguageFromLabels(voice.labels()))
                  .distinct()
                  .collect(Collectors.toList()))
              .build())
          .collect(Collectors.toList());

    } catch (Exception e) {
      log.error("Failed to fetch voices from Eleven Labs", e);
      throw new RuntimeException("Failed to fetch voices from Eleven Labs: " + e.getMessage(), e);
    }
  }

  private Stream<LanguageResponse> extractLanguageFromLabels(Map<String, String> labels) {
    if (labels != null && labels.get("language") != null) {
      return Stream.of(LanguageResponse.builder()
          .name(labels.get("language"))
          .build());
    }
    return Stream.empty();
  }
}
