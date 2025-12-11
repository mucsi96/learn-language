package io.github.mucsi96.learnlanguage.service;

import org.springframework.ai.audio.tts.TextToSpeechPrompt;
import org.springframework.ai.openai.OpenAiAudioSpeechModel;
import org.springframework.ai.openai.OpenAiAudioSpeechOptions;
import org.springframework.ai.openai.api.OpenAiAudioApi;
import org.springframework.ai.openai.api.OpenAiAudioApi.SpeechRequest.AudioResponseFormat;
import org.springframework.ai.openai.api.OpenAiAudioApi.SpeechRequest.Voice;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class OpenAIAudioService {

  private final OpenAiAudioSpeechModel speechModel;

  public byte[] generateAudio(String input, String voiceName) {
    Voice voice = parseVoice(voiceName);

    var options = OpenAiAudioSpeechOptions.builder()
        .model(OpenAiAudioApi.TtsModel.TTS_1_HD.getValue())
        .voice(voice)
        .responseFormat(AudioResponseFormat.MP3)
        .speed(1.0)
        .build();
    TextToSpeechPrompt prompt = new TextToSpeechPrompt(input, options);
    return speechModel.call(prompt).getResult().getOutput();
  }

  private Voice parseVoice(String voiceName) {
    if (voiceName == null || voiceName.isEmpty()) {
      return Voice.ALLOY;
    }

    return switch (voiceName.toLowerCase()) {
      case "alloy" -> Voice.ALLOY;
      case "ash" -> Voice.ASH;
      case "ballad" -> Voice.BALLAD;
      case "coral" -> Voice.CORAL;
      case "echo" -> Voice.ECHO;
      case "sage" -> Voice.SAGE;
      case "shimmer" -> Voice.SHIMMER;
      case "verse" -> Voice.VERSE;
      default -> {
        log.warn("Invalid voice name provided: {}, falling back to ALLOY", voiceName);
        yield Voice.ALLOY;
      }
    };
  }
}
