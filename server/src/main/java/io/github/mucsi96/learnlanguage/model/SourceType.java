package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public enum SourceType {
    PDF("pdf", "PDF Document"),
    IMAGES("images", "Image Collection");

    private final String code;
    private final String displayName;

    @JsonValue
    public String getCode() {
        return code;
    }

    @JsonCreator
    public static SourceType fromString(String code) {
        for (SourceType type : values()) {
            if (type.code.equalsIgnoreCase(code)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown source type: " + code);
    }
}
