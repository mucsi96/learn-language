package io.github.mucsi96.learnlanguage.model;

import java.util.Arrays;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum CardType {
    VOCABULARY("vocabulary"),
    SPEECH("speech");

    private final String typeName;

    @JsonValue
    public String getTypeName() {
        return typeName;
    }

    @JsonCreator
    public static CardType fromString(final String typeName) {
        return Arrays.stream(values())
            .filter(type -> type.typeName.equalsIgnoreCase(typeName))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Unknown card type: " + typeName));
    }
}
