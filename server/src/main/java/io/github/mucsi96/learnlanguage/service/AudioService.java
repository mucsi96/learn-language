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
public class AudioService {

  private final OpenAIClient openAIClient;

  public byte[] generateAudio(String input) throws IOException {
    SpeechCreateParams speechParams = SpeechCreateParams.builder()
        .input(input)
        .model(SpeechModel.TTS_1_HD)
        .voice(SpeechCreateParams.Voice.ALLOY)
        .responseFormat(SpeechCreateParams.ResponseFormat.MP3)
        .speed(1.0)
        .build();

    var response = openAIClient.audio().speech().create(speechParams);
    return response.body().readAllBytes();
  }
}
