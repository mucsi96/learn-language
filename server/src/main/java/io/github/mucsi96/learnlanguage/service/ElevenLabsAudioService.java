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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

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
          // .voiceSettings(ElevenLabsVoiceSettings.builder()
          //     .stability(0.5)
          //     .similarityBoost(0.5)
          //     .build())
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
}
