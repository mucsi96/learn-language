package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public enum ChatModel {
    GPT_5("gpt-5", "openai"),
    CLAUDE_SONNET_4_5("claude-sonnet-4-5", "anthropic");

    private final String modelName;
    private final String provider;

    @JsonValue
    public String getModelName() {
        return modelName;
    }

    @JsonCreator
    public static ChatModel fromString(String modelName) {
        for (ChatModel model : values()) {
            if (model.modelName.equals(modelName)) {
                return model;
            }
        }
        throw new IllegalArgumentException("Unknown chat model: " + modelName);
    }
}
