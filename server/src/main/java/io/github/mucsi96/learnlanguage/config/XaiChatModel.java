package io.github.mucsi96.learnlanguage.config;

import org.springframework.ai.openai.OpenAiChatModel;

// Wraps the xAI client in a dedicated type so it does not compete with the
// auto-configured OpenAiChatModel bean during injection by type.
public record XaiChatModel(OpenAiChatModel chatModel) {
}
