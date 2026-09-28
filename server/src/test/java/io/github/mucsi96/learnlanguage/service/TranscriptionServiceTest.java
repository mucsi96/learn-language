package io.github.mucsi96.learnlanguage.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.Test;

import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.sun.net.httpserver.HttpServer;

class TranscriptionServiceTest {

    @Test
    void sendsSupportedLanguageHintsAndPreservesTheRecordingFilename() throws Exception {
        final var requestBody = new AtomicReference<String>();
        final var server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/audio/transcriptions", exchange -> {
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            final var response = "{\"text\":\"Miért der Zug?\"}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
            try (final var output = exchange.getResponseBody()) {
                output.write(response);
            }
        });
        server.start();
        final var client = OpenAIOkHttpClient.builder()
                .apiKey("test-key")
                .baseUrl("http://localhost:" + server.getAddress().getPort())
                .build();
        try {
            final var service = new TranscriptionService(client, mock(ModelUsageLoggingService.class),
                    mock(ProviderBillingIssueService.class));

            assertEquals("Miért der Zug?", service.transcribe(new byte[] { 1, 2, 3 }, "question.mp4"));
            assertTrue(requestBody.get().contains("name=\"languages[]\""));
            assertTrue(requestBody.get().contains("\r\n\r\nhu\r\n"));
            assertFalse(requestBody.get().contains("name=\"language\""));
            assertTrue(requestBody.get().contains("filename=\"question.mp4\""));
        } finally {
            client.close();
            server.stop(0);
        }
    }
}
