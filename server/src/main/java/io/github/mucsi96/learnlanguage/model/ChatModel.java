package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public enum ChatModel {
  GPT_5_5("gpt-5.5", ModelProvider.OPENAI),
  GPT_5_6_SOL("gpt-5.6-sol", ModelProvider.OPENAI),
  GPT_5_6_TERRA("gpt-5.6-terra", ModelProvider.OPENAI),
  GPT_5_6_LUNA("gpt-5.6-luna", ModelProvider.OPENAI),
  CLAUDE_SONNET_4_5("claude-sonnet-4-5", ModelProvider.ANTHROPIC),
  CLAUDE_SONNET_5("claude-sonnet-5", ModelProvider.ANTHROPIC),
  CLAUDE_HAIKU_4_5("claude-haiku-4-5", ModelProvider.ANTHROPIC),
  CLAUDE_OPUS_4_8("claude-opus-4-8", ModelProvider.ANTHROPIC),
  GEMINI_3_1_PRO_PREVIEW("gemini-3.1-pro-preview", ModelProvider.GOOGLE),
  GEMINI_3_FLASH_PREVIEW("gemini-3-flash-preview", ModelProvider.GOOGLE),
  GEMINI_3_5_FLASH("gemini-3.5-flash", ModelProvider.GOOGLE),
  GEMINI_3_6_FLASH("gemini-3.6-flash", ModelProvider.GOOGLE),
  GEMINI_3_7_FLASH("gemini-3.7-flash", ModelProvider.GOOGLE);

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
