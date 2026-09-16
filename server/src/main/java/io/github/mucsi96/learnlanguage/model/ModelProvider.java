package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Arrays;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Getter
public enum ModelProvider {
    OPENAI("openai", "OpenAI", "https://platform.openai.com/settings/organization/billing/"),
    ANTHROPIC("anthropic", "Anthropic", "https://platform.claude.com/settings/billing"),
    GOOGLE("google", "Google Gemini", "https://aistudio.google.com/usage?tab=billing"),
    XAI("xai", "xAI", "https://console.x.ai/team/default/billing"),
    ELEVENLABS("elevenlabs", "ElevenLabs", "https://elevenlabs.io/app/subscription"),
    IDEOGRAM("ideogram", "Ideogram", "https://ideogram.ai/manage-api");

    private final String code;
    private final String displayName;
    private final String billingUrl;

    public String getBillingMessage() {
        return displayName + " reported an API credit or billing problem. Review credits, payment settings and spending limits, then retry the failed operation.";
    }

    public static ModelProvider fromCode(String code) {
        return Arrays.stream(values()).filter(provider -> provider.code.equals(code)).findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Unknown AI provider: " + code));
    }

    @JsonValue
    public String getCode() {
        return code;
    }
}
