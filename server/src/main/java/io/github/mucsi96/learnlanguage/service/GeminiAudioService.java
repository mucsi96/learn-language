package io.github.mucsi96.learnlanguage.service;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

import com.google.genai.Client;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.PrebuiltVoiceConfig;
import com.google.genai.types.SpeechConfig;
import com.google.genai.types.VoiceConfig;

import io.github.mucsi96.learnlanguage.model.LanguageResponse;
import io.github.mucsi96.learnlanguage.model.ModelProvider;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.model.VoiceResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiAudioService {

  public static final String MODEL_NAME = "gemini-3.1-flash-tts-preview";

  private static final Map<String, String> LANGUAGE_NAMES = Map.of(
      "de", "German",
      "hu", "Hungarian");

  private static final int DEFAULT_SAMPLE_RATE = 24000;
  private static final Pattern SAMPLE_RATE_PATTERN = Pattern.compile("rate=(\\d+)");

  private record GeminiVoice(String name, String style) {
  }

  private static final List<GeminiVoice> VOICES = List.of(
      new GeminiVoice("Zephyr", "Bright"),
      new GeminiVoice("Puck", "Upbeat"),
      new GeminiVoice("Charon", "Informative"),
      new GeminiVoice("Kore", "Firm"),
      new GeminiVoice("Fenrir", "Excitable"),
      new GeminiVoice("Leda", "Youthful"),
      new GeminiVoice("Orus", "Firm"),
      new GeminiVoice("Aoede", "Breezy"),
      new GeminiVoice("Callirrhoe", "Easy-going"),
      new GeminiVoice("Autonoe", "Bright"),
      new GeminiVoice("Enceladus", "Breathy"),
      new GeminiVoice("Iapetus", "Clear"),
      new GeminiVoice("Umbriel", "Easy-going"),
      new GeminiVoice("Algieba", "Smooth"),
      new GeminiVoice("Despina", "Smooth"),
      new GeminiVoice("Erinome", "Clear"),
      new GeminiVoice("Algenib", "Gravelly"),
      new GeminiVoice("Rasalgethi", "Informative"),
      new GeminiVoice("Laomedeia", "Upbeat"),
      new GeminiVoice("Achernar", "Soft"),
      new GeminiVoice("Alnilam", "Firm"),
      new GeminiVoice("Schedar", "Even"),
      new GeminiVoice("Gacrux", "Mature"),
      new GeminiVoice("Pulcherrima", "Forward"),
      new GeminiVoice("Achird", "Friendly"),
      new GeminiVoice("Zubenelgenubi", "Casual"),
      new GeminiVoice("Vindemiatrix", "Gentle"),
      new GeminiVoice("Sadachbia", "Lively"),
      new GeminiVoice("Sadaltager", "Knowledgeable"),
      new GeminiVoice("Sulafat", "Warm"));

  private final Client googleAiClient;
  private final ModelUsageLoggingService usageLoggingService;

  public byte[] generateAudio(String input, String voiceName, String language, boolean singleWord) {
    long startTime = System.currentTimeMillis();
    try {
      final GenerateContentConfig config = GenerateContentConfig.builder()
          .responseModalities("AUDIO")
          .speechConfig(SpeechConfig.builder()
              .voiceConfig(VoiceConfig.builder()
                  .prebuiltVoiceConfig(PrebuiltVoiceConfig.builder()
                      .voiceName(voiceName)
                      .build())
                  .build())
              .build())
          .build();

      final var audioPart = googleAiClient.models
          .generateContent(MODEL_NAME, buildPrompt(input, language, singleWord), config)
          .candidates().orElseThrow(() -> new RuntimeException("No candidates in Gemini TTS response")).stream()
          .flatMap(candidate -> candidate.content().stream()
              .flatMap(content -> content.parts().stream())
              .flatMap(List::stream))
          .flatMap(part -> part.inlineData().stream())
          .findFirst()
          .orElseThrow(() -> new RuntimeException("No audio found in Gemini TTS response"));

      final byte[] pcm = audioPart.data()
          .orElseThrow(() -> new RuntimeException("Empty audio data in Gemini TTS response"));
      final byte[] result = toWav(pcm, audioPart.mimeType().map(this::parseSampleRate).orElse(DEFAULT_SAMPLE_RATE));

      long processingTime = System.currentTimeMillis() - startTime;
      usageLoggingService.logAudioUsage(MODEL_NAME, OperationType.AUDIO_GENERATION, input.length(), processingTime);

      return result;

    } catch (Exception e) {
      log.error("Failed to generate audio with Gemini TTS", e);
      throw new RuntimeException("Failed to generate audio with Gemini TTS: " + e.getMessage(), e);
    }
  }

  public List<VoiceResponse> getVoices() {
    final List<LanguageResponse> languages = LANGUAGE_NAMES.keySet().stream()
        .sorted()
        .map(code -> LanguageResponse.builder().name(code).build())
        .toList();

    return VOICES.stream()
        .map(voice -> VoiceResponse.builder()
            .id(voice.name())
            .displayName("%s (%s)".formatted(voice.name(), voice.style()))
            .languages(languages)
            .provider(ModelProvider.GOOGLE)
            .build())
        .toList();
  }

  private String buildPrompt(String input, String language, boolean singleWord) {
    final String languageName = language != null ? LANGUAGE_NAMES.get(language) : null;

    if (languageName == null) {
      return input;
    }

    final String unit = singleWord ? "word" : "sentence";
    return "Say the following %s %s: %s".formatted(languageName, unit, input);
  }

  private int parseSampleRate(String mimeType) {
    final Matcher matcher = SAMPLE_RATE_PATTERN.matcher(mimeType);
    return matcher.find() ? Integer.parseInt(matcher.group(1)) : DEFAULT_SAMPLE_RATE;
  }

  private byte[] toWav(byte[] pcm, int sampleRate) {
    final short channels = 1;
    final short bitsPerSample = 16;
    final int byteRate = sampleRate * channels * bitsPerSample / 8;

    return ByteBuffer.allocate(44 + pcm.length)
        .order(ByteOrder.LITTLE_ENDIAN)
        .put("RIFF".getBytes(StandardCharsets.US_ASCII))
        .putInt(36 + pcm.length)
        .put("WAVE".getBytes(StandardCharsets.US_ASCII))
        .put("fmt ".getBytes(StandardCharsets.US_ASCII))
        .putInt(16)
        .putShort((short) 1)
        .putShort(channels)
        .putInt(sampleRate)
        .putInt(byteRate)
        .putShort((short) (channels * bitsPerSample / 8))
        .putShort(bitsPerSample)
        .put("data".getBytes(StandardCharsets.US_ASCII))
        .putInt(pcm.length)
        .put(pcm)
        .array();
  }
}
