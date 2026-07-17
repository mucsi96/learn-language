package io.github.mucsi96.learnlanguage.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.BiConsumer;
import java.util.function.Function;

import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Slf4j
public class SpeechmaticsSession {

    private final JsonMapper jsonMapper;
    private final String language;
    private final BiConsumer<String, List<String>> onTranscript;

    private final CompletableFuture<Void> started = new CompletableFuture<>();
    private final StringBuilder incoming = new StringBuilder();

    private WebSocket webSocket;
    private CompletableFuture<WebSocket> sendChain;

    public SpeechmaticsSession(JsonMapper jsonMapper, String language,
            BiConsumer<String, List<String>> onTranscript) {
        this.jsonMapper = jsonMapper;
        this.language = language;
        this.onTranscript = onTranscript;
    }

    public void connect(String url, String apiKey) {
        sendChain = HttpClient.newHttpClient()
                .newWebSocketBuilder()
                .header("Authorization", "Bearer " + apiKey)
                .buildAsync(URI.create(url), new Listener())
                .thenApply(ws -> {
                    this.webSocket = ws;
                    return ws;
                })
                .thenCompose(ws -> ws.sendText(startRecognitionMessage(), true))
                .thenCompose(ws -> started.thenApply(ignored -> ws));
    }

    public void sendAudio(ByteBuffer audio) {
        chain(ws -> ws.sendBinary(audio, true));
    }

    public void close() {
        chain(ws -> ws.sendText(endOfStreamMessage(), true))
                .thenCompose(ws -> ws.sendClose(WebSocket.NORMAL_CLOSURE, "done"));
    }

    private synchronized CompletableFuture<WebSocket> chain(
            Function<WebSocket, CompletableFuture<WebSocket>> op) {
        sendChain = sendChain
                .thenCompose(op)
                .exceptionally(error -> {
                    log.warn("Speechmatics send failed: {}", error.getMessage());
                    return webSocket;
                });
        return sendChain;
    }

    private String startRecognitionMessage() {
        return jsonMapper.writeValueAsString(Map.of(
                "message", "StartRecognition",
                "audio_format", Map.of(
                        "type", "raw",
                        "encoding", "pcm_s16le",
                        "sample_rate", 16000),
                "transcription_config", Map.of(
                        "language", language,
                        "enable_partials", false)));
    }

    private String endOfStreamMessage() {
        return jsonMapper.writeValueAsString(Map.of(
                "message", "EndOfStream",
                "last_seq_no", 0));
    }

    private void handleMessage(String message) {
        final JsonNode node = jsonMapper.readTree(message);
        final String type = node.path("message").asString("");

        if ("RecognitionStarted".equals(type)) {
            started.complete(null);
            return;
        }

        if ("AddTranscript".equals(type)) {
            final List<String> words = new ArrayList<>();
            node.path("results").forEach(result -> {
                if (!"word".equals(result.path("type").asString(""))) {
                    return;
                }
                final String content = result.path("alternatives").path(0).path("content").asString("");
                if (!content.isBlank()) {
                    words.add(content);
                }
            });
            final String transcript = node.path("metadata").path("transcript").asString(
                    String.join(" ", words));
            if (!words.isEmpty()) {
                onTranscript.accept(transcript, words);
            }
        }
    }

    private class Listener implements WebSocket.Listener {
        @Override
        public CompletionStage<?> onText(WebSocket ws, CharSequence data, boolean last) {
            incoming.append(data);
            if (last) {
                final String message = incoming.toString();
                incoming.setLength(0);
                try {
                    handleMessage(message);
                } catch (Exception e) {
                    log.warn("Failed to handle Speechmatics message: {}", e.getMessage());
                }
            }
            ws.request(1);
            return null;
        }

        @Override
        public void onError(WebSocket ws, Throwable error) {
            log.warn("Speechmatics connection error: {}", error.getMessage());
            started.completeExceptionally(error);
        }
    }
}
