package io.github.mucsi96.learnlanguage.service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

import org.springframework.stereotype.Service;

import com.openai.client.OpenAIClient;
import com.openai.core.MultipartField;
import com.openai.models.audio.transcriptions.TranscriptionCreateParams;

import io.github.mucsi96.learnlanguage.model.OperationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class TranscriptionService {

    private static final String MODEL_NAME = "gpt-4o-transcribe";

    private final OpenAIClient openAIClient;
    private final ModelUsageLoggingService usageLoggingService;

    public String transcribe(byte[] audio, String fileName) {
        final long startTime = System.currentTimeMillis();
        try {
            final TranscriptionCreateParams params = TranscriptionCreateParams.builder()
                .file(MultipartField.<InputStream>builder()
                    .value(new ByteArrayInputStream(audio))
                    .filename(fileName)
                    .build())
                .model(MODEL_NAME)
                .language("hu")
                .build();

            final String text = openAIClient.audio().transcriptions().create(params)
                .asTranscription()
                .text();

            final long processingTime = System.currentTimeMillis() - startTime;
            logUsage(text, processingTime);

            return text;
        } catch (Exception e) {
            log.error("Failed to transcribe audio with OpenAI", e);
            throw new RuntimeException("Failed to transcribe audio with OpenAI: " + e.getMessage(), e);
        }
    }

    private void logUsage(String text, long processingTime) {
        try {
            usageLoggingService.logAudioUsage(MODEL_NAME, OperationType.TRANSCRIPTION, text.length(), processingTime);
        } catch (Exception e) {
            log.warn("Failed to log transcription usage: {}", e.getMessage());
        }
    }
}
