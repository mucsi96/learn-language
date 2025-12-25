package io.github.mucsi96.learnlanguage.controller;

import java.io.IOException;
import java.util.UUID;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.azure.core.util.BinaryData;

import io.github.mucsi96.learnlanguage.model.AudioSourceRequest;
import io.github.mucsi96.learnlanguage.model.AudioData;
import io.github.mucsi96.learnlanguage.model.AudioModelResponse;
import io.github.mucsi96.learnlanguage.model.VoiceResponse;
import io.github.mucsi96.learnlanguage.service.AudioService;
import io.github.mucsi96.learnlanguage.service.FileStorageService;
import io.github.mucsi96.learnlanguage.service.ElevenLabsAudioService;

import java.util.List;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class AudioController {

  private final FileStorageService fileStorageService;
  private final AudioService audioService;
  private final ElevenLabsAudioService elevenLabsAudioService;

  @PostMapping("/audio")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public AudioData createAudio(@Valid @RequestBody AudioSourceRequest audioSource) throws IOException {
    String uuid = UUID.randomUUID().toString();
    String filePath = "audio/%s.mp3".formatted(uuid);

    byte[] data = audioService.generateAudio(audioSource.getInput(), audioSource.getVoice(), audioSource.getModel(), audioSource.getLanguage());
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

  @GetMapping("/voices")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public List<VoiceResponse> getVoices() {
    return elevenLabsAudioService.getVoices();
  }

  @GetMapping("/audio-models")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public List<AudioModelResponse> getAudioModels() {
    return audioService.getAvailableModels();
  }
}
