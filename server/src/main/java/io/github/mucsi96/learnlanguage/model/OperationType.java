package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public enum OperationType {
    TRANSLATION_EN("translation_en", "English Translation"),
    TRANSLATION_CH("translation_ch", "Swiss German Translation"),
    TRANSLATION_HU("translation_hu", "Hungarian Translation"),
    GENDER("gender", "Gender Detection"),
    WORD_TYPE("word_type", "Word Type Classification");

    private final String code;
    private final String displayName;

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
}
