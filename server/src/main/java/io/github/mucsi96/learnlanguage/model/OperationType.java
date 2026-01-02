package io.github.mucsi96.learnlanguage.model;

import java.util.Arrays;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public enum OperationType {
    TRANSLATION_EN("translation_en", "English Translation", ModelType.CHAT),
    TRANSLATION_CH("translation_ch", "Swiss German Translation", ModelType.CHAT),
    TRANSLATION_HU("translation_hu", "Hungarian Translation", ModelType.CHAT),
    GENDER("gender", "Gender Detection", ModelType.CHAT),
    WORD_TYPE("word_type", "Word Type Classification", ModelType.CHAT),
    AUDIO_GENERATION("audio_generation", "Audio Generation", ModelType.AUDIO),
    IMAGE_GENERATION("image_generation", "Image Generation", ModelType.IMAGE);

    private final String code;
    private final String displayName;
    private final ModelType modelType;

    @JsonValue
    public String getCode() {
        return code;
    }

    @JsonCreator
    public static OperationType fromCode(String code) {
        for (OperationType type : values()) {
            if (type.code.equals(code)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown operation type: " + code);
    }

    public static List<OperationType> getByModelType(ModelType modelType) {
        return Arrays.stream(values())
                .filter(op -> op.modelType == modelType)
                .toList();
    }
}
