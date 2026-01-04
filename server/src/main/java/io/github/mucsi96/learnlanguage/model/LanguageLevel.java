package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public enum LanguageLevel {
    A1("A1", "A1 - Beginner"),
    A2("A2", "A2 - Elementary"),
    B1("B1", "B1 - Intermediate"),
    B2("B2", "B2 - Upper Intermediate"),
    C1("C1", "C1 - Advanced"),
    C2("C2", "C2 - Proficient");

    private final String code;
    private final String displayName;

    @JsonValue
    public String getCode() {
        return code;
    }

    @JsonCreator
    public static LanguageLevel fromString(String code) {
        for (LanguageLevel languageLevel : values()) {
            if (languageLevel.code.equalsIgnoreCase(code)) {
                return languageLevel;
            }
        }
        throw new IllegalArgumentException("Unknown language level: " + code);
    }
}
