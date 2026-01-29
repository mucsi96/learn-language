package io.github.mucsi96.learnlanguage.model;

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
    IMAGE_GENERATION("image_generation", "Image Generation", false),
    AUDIO_GENERATION("audio_generation", "Audio Generation", false);

    private final String code;
    private final String displayName;
    private final boolean chatOperation;

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
