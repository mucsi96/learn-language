package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public enum OperationType {
    TRANSLATION("translation", "Translation"),
    EXTRACTION("extraction", "Extraction"),
    CLASSIFICATION("classification", "Classification"),
    IMAGE_GENERATION("image_generation", "Image Generation"),
    AUDIO_GENERATION("audio_generation", "Audio Generation");

    private final String code;
    private final String displayName;

    @JsonValue
    public String getCode() {
        return code;
    }

    @JsonCreator
    public static OperationType fromString(String code) {
        for (OperationType type : values()) {
            if (type.code.equals(code)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown operation type: " + code);
    }
}
