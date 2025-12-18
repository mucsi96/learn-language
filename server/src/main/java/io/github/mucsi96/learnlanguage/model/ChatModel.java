package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public enum ChatModel {
  GPT_4O("gpt-4o", false, 3.00, 10.00),
  GPT_4_1("gpt-4.1", false, 2.00, 8.00),
  GPT_5("gpt-5", false, 1.25, 10.00),
  CLAUDE_SONNET_4_5("claude-sonnet-4-5", false, 3.00, 15.00),
  GEMINI_3_PRO_PREVIEW("gemini-3-pro-preview", true, 1.25, 10.00);

  private final String modelName;
  private final boolean primary;
  private final double inputPricePerMillionTokens;
  private final double outputPricePerMillionTokens;

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
