package io.github.mucsi96.learnlanguage.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import lombok.Getter;

@Component
@Getter
public class SpeechmaticsProperties {

    private final String apiKey;
    private final String url;

    SpeechmaticsProperties(
            @Value("${spring.ai.speechmatics.api-key}") String apiKey,
            @Value("${spring.ai.speechmatics.url}") String url) {
        this.apiKey = apiKey;
        this.url = url;
    }
}
