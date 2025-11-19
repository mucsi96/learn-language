package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public enum LanguageLevel {
    A1("A1"),
    A2("A2"),
    B1("B1"),
    B2("B2"),
    C1("C1"),
    C2("C2");

    private final String level;

    @JsonValue
    public String getLevel() {
        return level;
    }

    @JsonCreator
    public static LanguageLevel fromString(String level) {
        for (LanguageLevel languageLevel : values()) {
            if (languageLevel.level.equalsIgnoreCase(level)) {
                return languageLevel;
            }
        }
        throw new IllegalArgumentException("Unknown language level: " + level);
    }
}
