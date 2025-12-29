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

  private static final String ELEVEN_V3_MODEL = "eleven_v3";

  private static final Map<String, String> LANGUAGE_NAMES = Map.of(
      "de", "German",
      "hu", "Hungarian"
  );

  private final ElevenLabsTextToSpeechModel textToSpeechModel;
  private final ElevenLabsVoicesApi voicesApi;
  private final ModelUsageLoggingService usageLoggingService;

  public byte[] generateAudio(String input, String voiceId, String model, String language) {
    long startTime = System.currentTimeMillis();
    try {
      String processedInput = input;
      String languageCode = language;

      if (ELEVEN_V3_MODEL.equals(model) && language != null) {
        String languageName = LANGUAGE_NAMES.get(language);
        if (languageName != null) {
          processedInput = "[speaking " + languageName + "] " + input;
          languageCode = null;
        }
      }

      var speechOptions = ElevenLabsTextToSpeechOptions.builder()
          .voiceId(voiceId)
          .model(model)
          .languageCode(languageCode)
          .build();

      var speechPrompt = new TextToSpeechPrompt(processedInput, speechOptions);

      byte[] result = textToSpeechModel.call(speechPrompt).getResult().getOutput();

      long processingTime = System.currentTimeMillis() - startTime;
      usageLoggingService.logAudioUsage(model, "audio_generation", input.length(), processingTime);

      return result;

    } catch (Exception e) {
      log.error("Failed to generate audio with Eleven Labs", e);
      throw new RuntimeException("Failed to generate audio with Eleven Labs: " + e.getMessage(), e);
    }
  }

  private static final List<String> SUPPORTED_LANGUAGES = List.of("de", "hu");

  public List<VoiceResponse> getVoices() {
    try {
      var response = voicesApi.getVoices();

      if (response.getBody() == null || response.getBody().voices() == null) {
        throw new RuntimeException("No voices returned from Eleven Labs API");
      }

      return response.getBody().voices().stream()
          .map(voice -> {
              List<LanguageResponse> allLanguages = Stream.concat(
                  voice.verifiedLanguages() != null ? voice.verifiedLanguages().stream()
                      .map(lang -> LanguageResponse.builder()
                          .name(lang.language())
                          .build())
                      : Stream.empty(),
                  extractLanguageFromLabels(voice.labels()))
                  .distinct()
                  .collect(Collectors.toList());

              List<LanguageResponse> supportedLanguages = allLanguages.stream()
                  .filter(lang -> SUPPORTED_LANGUAGES.contains(lang.getName()))
                  .collect(Collectors.toList());

              return VoiceResponse.builder()
                  .id(voice.voiceId())
                  .displayName(voice.name())
                  .languages(supportedLanguages)
                  .category(voice.category() != null ? voice.category().getValue() : null)
                  .build();
          })
          .filter(voice -> !voice.getLanguages().isEmpty())
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
