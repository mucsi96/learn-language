package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum CardType {
    VOCABULARY("vocabulary"),
    GRAMMAR("grammar");

    private final String typeName;

    @JsonValue
    public String getTypeName() {
        return typeName;
    }

    @JsonCreator
    public static CardType fromString(String typeName) {
        for (CardType type : values()) {
            if (type.typeName.equalsIgnoreCase(typeName)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown card type: " + typeName);
    }
}
