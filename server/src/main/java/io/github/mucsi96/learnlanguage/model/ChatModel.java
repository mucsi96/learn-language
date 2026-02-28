package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public enum ChatModel {
  GPT_4O("gpt-4o", ModelProvider.OPENAI),
  GPT_4O_MINI("gpt-4o-mini", ModelProvider.OPENAI),
  GPT_4_1("gpt-4.1", ModelProvider.OPENAI),
  GPT_4_1_MINI("gpt-4.1-mini", ModelProvider.OPENAI),
  GPT_4_1_NANO("gpt-4.1-nano", ModelProvider.OPENAI),
  GPT_5("gpt-5", ModelProvider.OPENAI),
  GPT_5_2("gpt-5.2", ModelProvider.OPENAI),
  GPT_5_MINI("gpt-5-mini", ModelProvider.OPENAI),
  GPT_5_NANO("gpt-5-nano", ModelProvider.OPENAI),
  CLAUDE_SONNET_4_5("claude-sonnet-4-5", ModelProvider.ANTHROPIC),
  CLAUDE_HAIKU_4_5("claude-haiku-4-5", ModelProvider.ANTHROPIC),
  GEMINI_3_1_PRO_PREVIEW("gemini-3.1-pro-preview", ModelProvider.GOOGLE),
  GEMINI_3_FLASH_PREVIEW("gemini-3-flash-preview", ModelProvider.GOOGLE);

  private final String modelName;
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
