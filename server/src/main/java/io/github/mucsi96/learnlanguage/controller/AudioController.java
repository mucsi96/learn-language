package io.github.mucsi96.learnlanguage.controller;

import java.io.IOException;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.azure.core.util.BinaryData;

import io.github.mucsi96.learnlanguage.model.AudioSourceRequest;
import io.github.mucsi96.learnlanguage.model.AudioData;
import io.github.mucsi96.learnlanguage.model.ModelType;
import io.github.mucsi96.learnlanguage.repository.ModelUsageLogRepository;
import io.github.mucsi96.learnlanguage.service.AudioService;
import io.github.mucsi96.learnlanguage.service.FileStorageService;
import io.github.mucsi96.learnlanguage.service.RateLimitSettingService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class AudioController {

  private final FileStorageService fileStorageService;
  private final AudioService audioService;
  private final RateLimitSettingService rateLimitSettingService;
  private final ModelUsageLogRepository modelUsageLogRepository;

  @PostMapping("/audio")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public AudioData createAudio(@Valid @RequestBody AudioSourceRequest audioSource) throws IOException {
    final int dailyLimit = rateLimitSettingService.getAudioDailyLimit();
    if (dailyLimit > 0) {
      final long todayUsage = modelUsageLogRepository.countByModelTypeSince(
          ModelType.AUDIO, LocalDate.now(ZoneOffset.UTC).atStartOfDay());
      if (todayUsage >= dailyLimit) {
        throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
            "Daily audio generation limit of " + dailyLimit + " reached");
      }
    }
    String uuid = UUID.randomUUID().toString();
    String filePath = "audio/%s.mp3".formatted(uuid);

    byte[] data = audioService.generateAudio(audioSource.getInput(), audioSource.getVoice(), audioSource.getModel(), audioSource.getLanguage(), audioSource.getContext(), Boolean.TRUE.equals(audioSource.getSingleWord()));
    fileStorageService.saveFile(BinaryData.fromBytes(data), filePath);

    return AudioData.builder()
        .id(uuid)
        .voice(audioSource.getVoice())
        .model(audioSource.getModel() != null ? audioSource.getModel().toString() : null)
        .language(audioSource.getLanguage())
        .text(audioSource.getInput())
        .selected(audioSource.getSelected())
        .build();
  }

  @GetMapping(value = "/audio/{id}", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
  @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
  public ResponseEntity<byte[]> getAudio(@PathVariable String id) {
    String filePath = "audio/%s.mp3".formatted(id);
    byte[] audioData = fileStorageService.fetchFile(filePath).toBytes();

    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType("audio/mpeg"))
        .header("Cache-Control", "public, max-age=31536000, immutable")
        .body(audioData);
  }

  @DeleteMapping("/audio/{id}")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ResponseEntity<Void> deleteAudio(@PathVariable String id) {
    String filePath = "audio/%s.mp3".formatted(id);
    fileStorageService.deleteFile(filePath);
    return ResponseEntity.noContent().build();
  }
}
