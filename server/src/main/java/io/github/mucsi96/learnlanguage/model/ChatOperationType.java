package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public enum ChatOperationType {
    TRANSLATION_EN("translation_en", "English Translation"),
    TRANSLATION_CH("translation_ch", "Swiss German Translation"),
    TRANSLATION_HU("translation_hu", "Hungarian Translation"),
    GENDER("gender", "Gender Detection"),
    WORD_TYPE("word_type", "Word Type"),
    WORD_EXTRACTION("word_extraction", "Word Extraction");

    private final String code;
    private final String displayName;

    @JsonValue
    public String getCode() {
        return code;
    }

    @JsonCreator
    public static ChatOperationType fromString(String code) {
        for (ChatOperationType type : values()) {
            if (type.code.equals(code)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown operation type: " + code);
    }
}
