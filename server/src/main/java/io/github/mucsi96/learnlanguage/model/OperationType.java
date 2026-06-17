package io.github.mucsi96.learnlanguage.model;

import java.util.Arrays;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public enum OperationType {
    TRANSLATION("translation", "Translation", true),
    EXTRACTION("extraction", "Extraction", true),
    CLASSIFICATION("classification", "Classification", true),
    DUPLICATE_DETECTION("duplicate_detection", "Duplicate Detection", true),
    IMAGE_GENERATION("image_generation", "Image Generation", false),
    IMAGE_DESCRIPTION("image_description", "Image Description", true),
    AUDIO_GENERATION("audio_generation", "Audio Generation", false),
    EXPLANATION("explanation", "Explanation", true),
    TRANSCRIPTION("transcription", "Transcription", false),
    CARD_GENERATION("card_generation", "Card Generation", true);

    private final String code;
    private final String displayName;
    private final boolean chatOperation;

    @JsonValue
    public String getCode() {
        return code;
    }

    @JsonCreator
    public static OperationType fromString(final String code) {
        return Arrays.stream(values())
            .filter(type -> type.code.equalsIgnoreCase(code))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Unknown operation type: " + code));
    }
}
