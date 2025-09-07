package io.github.mucsi96.learnlanguage.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import io.github.mucsi96.learnlanguage.model.ElevenLabsTextToSpeechRequest;
import io.github.mucsi96.learnlanguage.model.ElevenLabsVoicesResponse;
import io.github.mucsi96.learnlanguage.model.VoiceResponse;
import io.github.mucsi96.learnlanguage.model.LanguageResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class ElevenLabsAudioService {

  private final RestTemplate restTemplate;

  @Value("${elevenlabs.apiKey}")
  private String apiKey;

  @Value("${elevenlabs.baseUrl}")
  private String baseUrl;

  public byte[] generateAudio(String input, String voiceId, String language) {
    try {
      String url = baseUrl + "/v1/text-to-speech/" + voiceId;

      HttpHeaders headers = new HttpHeaders();
      headers.setContentType(MediaType.APPLICATION_JSON);
      headers.set("xi-api-key", apiKey);
      headers.set("Content-Type", "application/json");

      ElevenLabsTextToSpeechRequest requestBody = ElevenLabsTextToSpeechRequest.builder()
          .text(input)
          .modelId("eleven_turbo_v2_5")
          .languageCode(language)
          .build();

      HttpEntity<ElevenLabsTextToSpeechRequest> requestEntity = new HttpEntity<>(requestBody, headers);

      ResponseEntity<byte[]> response = restTemplate.exchange(
        url,
        HttpMethod.POST,
        requestEntity,
        byte[].class
      );

      if (response.getBody() == null) {
        throw new RuntimeException("No audio generated from Eleven Labs API");
      }

      return response.getBody();

    } catch (Exception e) {
      log.error("Failed to generate audio with Eleven Labs", e);
      throw new RuntimeException("Failed to generate audio with Eleven Labs: " + e.getMessage(), e);
    }
  }

  public List<VoiceResponse> getVoices() {
    try {
      String url = baseUrl + "/v1/voices";

      HttpHeaders headers = new HttpHeaders();
      headers.set("xi-api-key", apiKey);

      HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

      ResponseEntity<ElevenLabsVoicesResponse> response = restTemplate.exchange(
        url,
        HttpMethod.GET,
        requestEntity,
        ElevenLabsVoicesResponse.class
      );

      if (response.getBody() == null || response.getBody().getVoices() == null) {
        throw new RuntimeException("No voices returned from Eleven Labs API");
      }

      return response.getBody().getVoices().stream()
          .filter(voice -> voice.getSharing() != null && "copied".equals(voice.getSharing().getStatus()))
          .map(voice -> VoiceResponse.builder()
              .id(voice.getVoiceId())
              .displayName(voice.getName())
              .languages(Stream.concat(
                  // Stream from verified languages
                  voice.getVerifiedLanguages() != null ? 
                      voice.getVerifiedLanguages().stream()
                          .map(lang -> LanguageResponse.builder()
                              .name(lang.getLanguage())
                              .build()) : 
                      Stream.empty(),
                  // Stream from labels language
                  voice.getLabels() != null && voice.getLabels().getLanguage() != null ?
                      Stream.of(LanguageResponse.builder()
                          .name(voice.getLabels().getLanguage())
                          .build()) :
                      Stream.empty()
              )
              .distinct()
              .collect(Collectors.toList()))
              .build())
          .collect(Collectors.toList());

    } catch (Exception e) {
      log.error("Failed to fetch voices from Eleven Labs", e);
      throw new RuntimeException("Failed to fetch voices from Eleven Labs: " + e.getMessage(), e);
    }
  }
}
