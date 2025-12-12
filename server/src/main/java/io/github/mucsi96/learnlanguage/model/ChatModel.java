package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public enum ChatModel {
  GPT_4O("gpt-4o"),
  GPT_4_1("gpt-4.1"),
  GPT_5("gpt-5"),
  CLAUDE_SONNET_4_5("claude-sonnet-4-5"),
  GEMINI_2_5_PRO_PREVIEW("gemini-3-pro-preview");

  private final String modelName;

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
