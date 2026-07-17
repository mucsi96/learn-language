package io.github.mucsi96.learnlanguage.model;

import java.util.Arrays;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

// Effort levels are exposed as separate models. Supported levels per model:
// OpenAI: https://developers.openai.com/api/docs/guides/reasoning
// Anthropic: https://platform.claude.com/docs/en/build-with-claude/effort
// Google: https://ai.google.dev/gemini-api/docs/gemini-3
@RequiredArgsConstructor
@Getter
public enum ChatModel {
  GPT_4O("gpt-4o", "gpt-4o", ModelProvider.OPENAI, null),
  GPT_4O_MINI("gpt-4o-mini", "gpt-4o-mini", ModelProvider.OPENAI, null),
  GPT_4_1("gpt-4.1", "gpt-4.1", ModelProvider.OPENAI, null),
  GPT_4_1_MINI("gpt-4.1-mini", "gpt-4.1-mini", ModelProvider.OPENAI, null),
  GPT_4_1_NANO("gpt-4.1-nano", "gpt-4.1-nano", ModelProvider.OPENAI, null),
  GPT_5("gpt-5", "gpt-5-chat-latest", ModelProvider.OPENAI, null),
  GPT_5_2("gpt-5.2", "gpt-5.2-chat-latest", ModelProvider.OPENAI, null),
  GPT_5_MINI("gpt-5-mini", "gpt-5-mini", ModelProvider.OPENAI, null),
  GPT_5_MINI_MINIMAL("gpt-5-mini-minimal", "gpt-5-mini", ModelProvider.OPENAI, "minimal"),
  GPT_5_MINI_LOW("gpt-5-mini-low", "gpt-5-mini", ModelProvider.OPENAI, "low"),
  GPT_5_MINI_MEDIUM("gpt-5-mini-medium", "gpt-5-mini", ModelProvider.OPENAI, "medium"),
  GPT_5_MINI_HIGH("gpt-5-mini-high", "gpt-5-mini", ModelProvider.OPENAI, "high"),
  GPT_5_NANO("gpt-5-nano", "gpt-5-nano", ModelProvider.OPENAI, null),
  GPT_5_NANO_MINIMAL("gpt-5-nano-minimal", "gpt-5-nano", ModelProvider.OPENAI, "minimal"),
  GPT_5_NANO_LOW("gpt-5-nano-low", "gpt-5-nano", ModelProvider.OPENAI, "low"),
  GPT_5_NANO_MEDIUM("gpt-5-nano-medium", "gpt-5-nano", ModelProvider.OPENAI, "medium"),
  GPT_5_NANO_HIGH("gpt-5-nano-high", "gpt-5-nano", ModelProvider.OPENAI, "high"),
  GPT_5_5("gpt-5.5", "gpt-5.5", ModelProvider.OPENAI, null),
  GPT_5_5_NONE("gpt-5.5-none", "gpt-5.5", ModelProvider.OPENAI, "none"),
  GPT_5_5_LOW("gpt-5.5-low", "gpt-5.5", ModelProvider.OPENAI, "low"),
  GPT_5_5_MEDIUM("gpt-5.5-medium", "gpt-5.5", ModelProvider.OPENAI, "medium"),
  GPT_5_5_HIGH("gpt-5.5-high", "gpt-5.5", ModelProvider.OPENAI, "high"),
  GPT_5_5_XHIGH("gpt-5.5-xhigh", "gpt-5.5", ModelProvider.OPENAI, "xhigh"),
  GPT_5_6_SOL("gpt-5.6-sol", "gpt-5.6-sol", ModelProvider.OPENAI, null),
  GPT_5_6_SOL_NONE("gpt-5.6-sol-none", "gpt-5.6-sol", ModelProvider.OPENAI, "none"),
  GPT_5_6_SOL_LOW("gpt-5.6-sol-low", "gpt-5.6-sol", ModelProvider.OPENAI, "low"),
  GPT_5_6_SOL_MEDIUM("gpt-5.6-sol-medium", "gpt-5.6-sol", ModelProvider.OPENAI, "medium"),
  GPT_5_6_SOL_HIGH("gpt-5.6-sol-high", "gpt-5.6-sol", ModelProvider.OPENAI, "high"),
  GPT_5_6_SOL_XHIGH("gpt-5.6-sol-xhigh", "gpt-5.6-sol", ModelProvider.OPENAI, "xhigh"),
  GPT_5_6_SOL_MAX("gpt-5.6-sol-max", "gpt-5.6-sol", ModelProvider.OPENAI, "max"),
  GPT_5_6_TERRA("gpt-5.6-terra", "gpt-5.6-terra", ModelProvider.OPENAI, null),
  GPT_5_6_TERRA_NONE("gpt-5.6-terra-none", "gpt-5.6-terra", ModelProvider.OPENAI, "none"),
  GPT_5_6_TERRA_LOW("gpt-5.6-terra-low", "gpt-5.6-terra", ModelProvider.OPENAI, "low"),
  GPT_5_6_TERRA_MEDIUM("gpt-5.6-terra-medium", "gpt-5.6-terra", ModelProvider.OPENAI, "medium"),
  GPT_5_6_TERRA_HIGH("gpt-5.6-terra-high", "gpt-5.6-terra", ModelProvider.OPENAI, "high"),
  GPT_5_6_TERRA_XHIGH("gpt-5.6-terra-xhigh", "gpt-5.6-terra", ModelProvider.OPENAI, "xhigh"),
  GPT_5_6_TERRA_MAX("gpt-5.6-terra-max", "gpt-5.6-terra", ModelProvider.OPENAI, "max"),
  GPT_5_6_LUNA("gpt-5.6-luna", "gpt-5.6-luna", ModelProvider.OPENAI, null),
  GPT_5_6_LUNA_NONE("gpt-5.6-luna-none", "gpt-5.6-luna", ModelProvider.OPENAI, "none"),
  GPT_5_6_LUNA_LOW("gpt-5.6-luna-low", "gpt-5.6-luna", ModelProvider.OPENAI, "low"),
  GPT_5_6_LUNA_MEDIUM("gpt-5.6-luna-medium", "gpt-5.6-luna", ModelProvider.OPENAI, "medium"),
  GPT_5_6_LUNA_HIGH("gpt-5.6-luna-high", "gpt-5.6-luna", ModelProvider.OPENAI, "high"),
  GPT_5_6_LUNA_XHIGH("gpt-5.6-luna-xhigh", "gpt-5.6-luna", ModelProvider.OPENAI, "xhigh"),
  GPT_5_6_LUNA_MAX("gpt-5.6-luna-max", "gpt-5.6-luna", ModelProvider.OPENAI, "max"),
  CLAUDE_SONNET_4_5("claude-sonnet-4-5", "claude-sonnet-4-5", ModelProvider.ANTHROPIC, null),
  CLAUDE_HAIKU_4_5("claude-haiku-4-5", "claude-haiku-4-5", ModelProvider.ANTHROPIC, null),
  CLAUDE_OPUS_4_8("claude-opus-4-8", "claude-opus-4-8", ModelProvider.ANTHROPIC, null),
  CLAUDE_OPUS_4_8_LOW("claude-opus-4-8-low", "claude-opus-4-8", ModelProvider.ANTHROPIC, "low"),
  CLAUDE_OPUS_4_8_MEDIUM("claude-opus-4-8-medium", "claude-opus-4-8", ModelProvider.ANTHROPIC, "medium"),
  CLAUDE_OPUS_4_8_HIGH("claude-opus-4-8-high", "claude-opus-4-8", ModelProvider.ANTHROPIC, "high"),
  CLAUDE_OPUS_4_8_XHIGH("claude-opus-4-8-xhigh", "claude-opus-4-8", ModelProvider.ANTHROPIC, "xhigh"),
  CLAUDE_OPUS_4_8_MAX("claude-opus-4-8-max", "claude-opus-4-8", ModelProvider.ANTHROPIC, "max"),
  CLAUDE_SONNET_5("claude-sonnet-5", "claude-sonnet-5", ModelProvider.ANTHROPIC, null),
  CLAUDE_SONNET_5_LOW("claude-sonnet-5-low", "claude-sonnet-5", ModelProvider.ANTHROPIC, "low"),
  CLAUDE_SONNET_5_MEDIUM("claude-sonnet-5-medium", "claude-sonnet-5", ModelProvider.ANTHROPIC, "medium"),
  CLAUDE_SONNET_5_HIGH("claude-sonnet-5-high", "claude-sonnet-5", ModelProvider.ANTHROPIC, "high"),
  CLAUDE_SONNET_5_XHIGH("claude-sonnet-5-xhigh", "claude-sonnet-5", ModelProvider.ANTHROPIC, "xhigh"),
  CLAUDE_SONNET_5_MAX("claude-sonnet-5-max", "claude-sonnet-5", ModelProvider.ANTHROPIC, "max"),
  GEMINI_3_1_PRO_PREVIEW("gemini-3.1-pro-preview", "gemini-3.1-pro-preview", ModelProvider.GOOGLE, null),
  GEMINI_3_1_PRO_PREVIEW_LOW("gemini-3.1-pro-preview-low", "gemini-3.1-pro-preview", ModelProvider.GOOGLE, "low"),
  GEMINI_3_1_PRO_PREVIEW_MEDIUM("gemini-3.1-pro-preview-medium", "gemini-3.1-pro-preview", ModelProvider.GOOGLE, "medium"),
  GEMINI_3_1_PRO_PREVIEW_HIGH("gemini-3.1-pro-preview-high", "gemini-3.1-pro-preview", ModelProvider.GOOGLE, "high"),
  GEMINI_3_FLASH_PREVIEW("gemini-3-flash-preview", "gemini-3-flash-preview", ModelProvider.GOOGLE, null),
  GEMINI_3_5_FLASH("gemini-3.5-flash", "gemini-3.5-flash", ModelProvider.GOOGLE, null),
  GEMINI_3_5_FLASH_MINIMAL("gemini-3.5-flash-minimal", "gemini-3.5-flash", ModelProvider.GOOGLE, "minimal"),
  GEMINI_3_5_FLASH_LOW("gemini-3.5-flash-low", "gemini-3.5-flash", ModelProvider.GOOGLE, "low"),
  GEMINI_3_5_FLASH_MEDIUM("gemini-3.5-flash-medium", "gemini-3.5-flash", ModelProvider.GOOGLE, "medium"),
  GEMINI_3_5_FLASH_HIGH("gemini-3.5-flash-high", "gemini-3.5-flash", ModelProvider.GOOGLE, "high");

  private final String modelName;
  private final String apiModelName;
  private final ModelProvider provider;
  private final String effort;

  @JsonValue
  public String getModelName() {
    return modelName;
  }

  @JsonCreator
  public static ChatModel fromString(String modelName) {
    return Arrays.stream(values())
        .filter(model -> model.modelName.equals(modelName))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("Unknown chat model: " + modelName));
  }
}
