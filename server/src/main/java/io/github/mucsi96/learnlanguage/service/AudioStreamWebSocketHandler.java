package io.github.mucsi96.learnlanguage.service;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;

import io.github.mucsi96.learnlanguage.config.JwtHandshakeInterceptor;
import io.github.mucsi96.learnlanguage.config.SpeechmaticsProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.json.JsonMapper;

@Component
@RequiredArgsConstructor
@Slf4j
public class AudioStreamWebSocketHandler extends BinaryWebSocketHandler {

    private static final String GERMAN = "de";
    private static final int SEND_TIME_LIMIT_MS = 5000;
    private static final int SEND_BUFFER_LIMIT_BYTES = 512 * 1024;

    private final JsonMapper jsonMapper;
    private final SpeechmaticsProperties speechmaticsProperties;
    private final AudioStreamWordService audioStreamWordService;

    private final Map<String, SpeechmaticsSession> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        final String sourceId = (String) session.getAttributes().get(JwtHandshakeInterceptor.SOURCE_ID_ATTRIBUTE);
        final WebSocketSession safeSession = new ConcurrentWebSocketSessionDecorator(
                session, SEND_TIME_LIMIT_MS, SEND_BUFFER_LIMIT_BYTES);
        final Set<String> processedWords = ConcurrentHashMap.newKeySet();

        final SpeechmaticsSession speechmatics = new SpeechmaticsSession(jsonMapper, GERMAN,
                (transcript, words) -> {
                    sendTranscript(safeSession, transcript);
                    words.forEach(word -> {
                        if (processedWords.add(word.toLowerCase())) {
                            audioStreamWordService.processWord(sourceId, word, transcript);
                        }
                    });
                });

        sessions.put(session.getId(), speechmatics);
        speechmatics.connect(speechmaticsProperties.getUrl(), speechmaticsProperties.getApiKey());
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
        final SpeechmaticsSession speechmatics = sessions.get(session.getId());
        if (speechmatics != null) {
            speechmatics.sendAudio(message.getPayload());
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        final SpeechmaticsSession speechmatics = sessions.remove(session.getId());
        if (speechmatics != null) {
            speechmatics.close();
        }
    }

    private void sendTranscript(WebSocketSession session, String transcript) {
        try {
            final String payload = jsonMapper.writeValueAsString(
                    Map.of("type", "transcript", "text", transcript));
            session.sendMessage(new TextMessage(payload));
        } catch (Exception e) {
            log.warn("Failed to send transcript to client: {}", e.getMessage());
        }
    }
}
