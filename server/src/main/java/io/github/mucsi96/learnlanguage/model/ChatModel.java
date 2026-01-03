package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public enum ChatModel {
  GPT_4O("gpt-4o", false, ModelProvider.OPENAI),
  GPT_4O_MINI("gpt-4o-mini", false, ModelProvider.OPENAI),
  GPT_4_1("gpt-4.1", false, ModelProvider.OPENAI),
  GPT_4_1_MINI("gpt-4.1-mini", false, ModelProvider.OPENAI),
  GPT_4_1_NANO("gpt-4.1-nano", false, ModelProvider.OPENAI),
  GPT_5("gpt-5", false, ModelProvider.OPENAI),
  GPT_5_2("gpt-5.2", false, ModelProvider.OPENAI),
  GPT_5_MINI("gpt-5-mini", false, ModelProvider.OPENAI),
  GPT_5_NANO("gpt-5-nano", false, ModelProvider.OPENAI),
  CLAUDE_SONNET_4_5("claude-sonnet-4-5", false, ModelProvider.ANTHROPIC),
  CLAUDE_HAIKU_4_5("claude-haiku-4-5", false, ModelProvider.ANTHROPIC),
  GEMINI_3_PRO_PREVIEW("gemini-3-pro-preview", true, ModelProvider.GOOGLE),
  GEMINI_3_FLASH_PREVIEW("gemini-3-flash-preview", false, ModelProvider.GOOGLE);

  private final String modelName;
  private final boolean primary;
  private final ModelProvider provider;

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
