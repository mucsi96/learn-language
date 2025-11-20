package io.github.mucsi96.learnlanguage.service;

import java.io.IOException;

import org.springframework.stereotype.Service;

import com.openai.client.OpenAIClient;
import com.openai.models.audio.speech.SpeechCreateParams;
import com.openai.models.audio.speech.SpeechModel;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class OpenAIAudioService {

  private final OpenAIClient openAIClient;

  public byte[] generateAudio(String input, String voiceName) throws IOException {
    SpeechCreateParams.Voice voice = parseVoice(voiceName);

    SpeechCreateParams speechParams = SpeechCreateParams.builder()
        .input(input)
        .model(SpeechModel.TTS_1_HD)
        .voice(voice)
        .responseFormat(SpeechCreateParams.ResponseFormat.MP3)
        .speed(1.0)
        .build();

    var response = openAIClient.audio().speech().create(speechParams);
    return response.body().readAllBytes();
  }

  private SpeechCreateParams.Voice parseVoice(String voiceName) {
    if (voiceName == null || voiceName.isEmpty()) {
      return SpeechCreateParams.Voice.ALLOY; // Default fallback
    }

    return switch (voiceName.toLowerCase()) {
      case "alloy" -> SpeechCreateParams.Voice.ALLOY;
      case "ash" -> SpeechCreateParams.Voice.ASH;
      case "ballad" -> SpeechCreateParams.Voice.BALLAD;
      case "coral" -> SpeechCreateParams.Voice.CORAL;
      case "echo" -> SpeechCreateParams.Voice.ECHO;
      case "sage" -> SpeechCreateParams.Voice.SAGE;
      case "shimmer" -> SpeechCreateParams.Voice.SHIMMER;
      case "verse" -> SpeechCreateParams.Voice.VERSE;
      default -> {
        log.warn("Invalid voice name provided: {}, falling back to ALLOY", voiceName);
        yield SpeechCreateParams.Voice.ALLOY;
      }
    };
  }
}
