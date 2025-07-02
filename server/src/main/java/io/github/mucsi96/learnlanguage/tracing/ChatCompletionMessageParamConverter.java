package io.github.mucsi96.learnlanguage.tracing;

import com.openai.models.chat.completions.ChatCompletionMessageParam;

public class ChatCompletionMessageParamConverter {

    public static AITracingMessage from(ChatCompletionMessageParam message) {
        if (message.isSystem()) {
            String systemMessage = message.asSystem().content().text().orElse(null);
            return AITracingMessage.builder()
                .role("system")
                .content(systemMessage)
                .build();
        } else if (message.isUser()) {
            String userMessage = message.asUser().content().text().orElse(null);
            return AITracingMessage.builder()
                .role("user")
                .content(userMessage)
                .build();
        } else if (message.isAssistant()) {
            String assistantMessage = message.asAssistant().content().map(c -> c.text().orElse(null)).orElse(null);
            return AITracingMessage.builder()
                .role("assistant")
                .content(assistantMessage)
                .build();
        } else {
            throw new UnsupportedOperationException("Unsupported message type: " + message);
        }
    }
}
