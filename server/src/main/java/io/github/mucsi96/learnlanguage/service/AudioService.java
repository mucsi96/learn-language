package io.github.mucsi96.learnlanguage.service;

import java.io.IOException;
import java.util.List;

import org.springframework.stereotype.Service;

import com.azure.core.util.BinaryData;

import io.github.mucsi96.learnlanguage.model.AudioModelResponse;
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
          .build(),
      AudioModelResponse.builder()
          .id("eleven_turbo_v2_5")
          .displayName("Eleven Turbo v2.5")
          .isDefault(false)
          .build()
  );

  private final ElevenLabsAudioService elevenLabsAudioService;
  private final AudioTrimService audioTrimService;
  private final FileStorageService fileStorageService;

  public byte[] generateAudio(String input, String voiceName, String model, String language, String context, boolean singleWord) throws IOException {
    if ("eleven_turbo_v2_5".equals(model) || "eleven_v3".equals(model)) {
      final byte[] rawAudio = elevenLabsAudioService.generateAudio(input, voiceName, model, language, context, singleWord);
      return audioTrimService.trimSilence(rawAudio);
    } else {
      throw new IllegalArgumentException("Unsupported audio model: " + model);
    }
  }

  public int trimAllExistingAudio() {
    final List<String> audioFiles = fileStorageService.listFiles("audio");
    log.info("Found {} existing audio files to process", audioFiles.size());

    final int trimmed = (int) audioFiles.stream()
        .filter(filePath -> {
          try {
            final byte[] original = fileStorageService.fetchFile(filePath).toBytes();
            final byte[] trimmedAudio = audioTrimService.trimSilence(original);

            if (trimmedAudio.length < original.length) {
              fileStorageService.saveFile(BinaryData.fromBytes(trimmedAudio), filePath);
              log.info("Trimmed {}: {} -> {} bytes", filePath, original.length, trimmedAudio.length);
              return true;
            }
            return false;
          } catch (Exception e) {
            log.warn("Failed to process {}", filePath, e);
            return false;
          }
        })
        .count();

    log.info("Trimmed silence from {} of {} audio files", trimmed, audioFiles.size());
    return trimmed;
  }

  public List<AudioModelResponse> getAvailableModels() {
    return AVAILABLE_MODELS;
  }
}
