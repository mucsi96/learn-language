package io.github.mucsi96.learnlanguage.service;

import java.io.IOException;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AudioService {

  private final OpenAIAudioService openAIAudioService;
  private final ElevenLabsAudioService elevenLabsAudioService;

  public byte[] generateAudio(String input, String voiceName, String model, String language) throws IOException {
    if ("elevenlabs".equals(model)) {
      return elevenLabsAudioService.generateAudio(input, voiceName, language);
    } else {
      return openAIAudioService.generateAudio(input, voiceName);
    }
  }
}
