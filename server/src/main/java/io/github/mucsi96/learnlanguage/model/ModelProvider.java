package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonValue;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public enum ModelProvider {
    OPENAI("openai"),
    ANTHROPIC("anthropic"),
    GOOGLE("google");

    private final String code;

    @JsonValue
    public String getCode() {
        return code;
    }
}
