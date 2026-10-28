package io.github.mucsi96.learnlanguage.service;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.ai.elevenlabs.ElevenLabsTextToSpeechModel;
import org.springframework.ai.elevenlabs.ElevenLabsTextToSpeechOptions;
import org.springframework.ai.elevenlabs.api.ElevenLabsApi;
import org.springframework.ai.elevenlabs.api.ElevenLabsVoicesApi;

import com.sun.net.httpserver.HttpServer;
import tools.jackson.databind.json.JsonMapper;
import io.github.mucsi96.learnlanguage.config.ModelPricingConfig;
import io.github.mucsi96.learnlanguage.model.OperationType;

class ElevenLabsV4Test {

    @ParameterizedTest
    @CsvSource({"de, Haus, true", "hu, A ház nagy., false"})
    void generatesV4AudioWithNativeLanguageAndTracksItsCost(String language, String text, boolean singleWord)
            throws Exception {
        final var requestBody = new AtomicReference<String>();
        final var audio = new byte[] { 1, 2, 3 };
        final var server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/v1/text-to-speech/test-voice", exchange -> {
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            exchange.getResponseHeaders().set("Content-Type", "audio/mpeg");
            exchange.sendResponseHeaders(200, audio.length);
            try (final var output = exchange.getResponseBody()) {
                output.write(audio);
            }
        });
        server.start();
        try {
            final var api = ElevenLabsApi.builder().apiKey("test-key")
                    .baseUrl("http://localhost:" + server.getAddress().getPort()).build();
            final var model = new ElevenLabsTextToSpeechModel(api, ElevenLabsTextToSpeechOptions.builder().build());
            final var usage = mock(ModelUsageLoggingService.class);
            final var elevenLabs = new ElevenLabsAudioService(model, mock(ElevenLabsVoicesApi.class), usage,
                    mock(ProviderBillingIssueService.class));
            final var service = new AudioService(elevenLabs, mock(GeminiAudioService.class));

            assertArrayEquals(audio, service.generateAudio(text, "test-voice", "eleven_v4", language,
                    "Previous sentence.", singleWord));

            final var request = JsonMapper.builder().build().readTree(requestBody.get());
            assertEquals("eleven_v4", request.path("model_id").asText());
            assertEquals(text, request.path("text").asText());
            assertEquals(language, request.path("language_code").asText());
            assertEquals("Previous sentence.", request.path("previous_text").asText());
            assertFalse(request.path("voice_settings").hasNonNull("speed"));
            assertFalse(request.path("voice_settings").hasNonNull("style"));
            verify(usage).logAudioUsage(eq("eleven_v4"), eq(OperationType.AUDIO_GENERATION), eq((long) text.length()), anyLong());
            assertEquals(0, new BigDecimal("0.08").compareTo(
                    new ModelPricingConfig().calculateAudioCost("eleven_v4", 1000)));
        } finally {
            server.stop(0);
        }
    }
}
