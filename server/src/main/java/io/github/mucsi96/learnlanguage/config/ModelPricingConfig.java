package io.github.mucsi96.learnlanguage.config;

import java.math.BigDecimal;
import java.util.Map;

import org.springframework.context.annotation.Configuration;

// Pricing sources:
// OpenAI: https://platform.openai.com/docs/pricing
// Google: https://ai.google.dev/gemini-api/docs/pricing
// Anthropic: https://platform.claude.com/docs/en/about-claude/pricing
// ElevenLabs: https://elevenlabs.io/pricing/api
@Configuration
public class ModelPricingConfig {

    public record ChatModelPricing(BigDecimal inputPerMillion, BigDecimal outputPerMillion) {}
    public record ImageModelPricing(BigDecimal perImage) {}
    public record AudioModelPricing(BigDecimal perThousandCharacters) {}

    // Keyed by model name; every effort-level variant has its own entry.
    private static final Map<String, ChatModelPricing> CHAT_MODEL_PRICING = Map.ofEntries(
        // OpenAI GPT-4o family
        Map.entry("gpt-4o", new ChatModelPricing(new BigDecimal("2.50"), new BigDecimal("10.00"))),
        Map.entry("gpt-4o-mini", new ChatModelPricing(new BigDecimal("0.15"), new BigDecimal("0.60"))),
        // OpenAI GPT-4.1 family
        Map.entry("gpt-4.1", new ChatModelPricing(new BigDecimal("2.00"), new BigDecimal("8.00"))),
        Map.entry("gpt-4.1-mini", new ChatModelPricing(new BigDecimal("0.40"), new BigDecimal("1.60"))),
        Map.entry("gpt-4.1-nano", new ChatModelPricing(new BigDecimal("0.10"), new BigDecimal("0.40"))),
        // OpenAI GPT-5 family
        Map.entry("gpt-5", new ChatModelPricing(new BigDecimal("1.25"), new BigDecimal("10.00"))),
        Map.entry("gpt-5.2", new ChatModelPricing(new BigDecimal("1.75"), new BigDecimal("14.00"))),
        Map.entry("gpt-5-mini", new ChatModelPricing(new BigDecimal("0.25"), new BigDecimal("2.00"))),
        Map.entry("gpt-5-mini-minimal", new ChatModelPricing(new BigDecimal("0.25"), new BigDecimal("2.00"))),
        Map.entry("gpt-5-mini-low", new ChatModelPricing(new BigDecimal("0.25"), new BigDecimal("2.00"))),
        Map.entry("gpt-5-mini-medium", new ChatModelPricing(new BigDecimal("0.25"), new BigDecimal("2.00"))),
        Map.entry("gpt-5-mini-high", new ChatModelPricing(new BigDecimal("0.25"), new BigDecimal("2.00"))),
        Map.entry("gpt-5-nano", new ChatModelPricing(new BigDecimal("0.05"), new BigDecimal("0.40"))),
        Map.entry("gpt-5-nano-minimal", new ChatModelPricing(new BigDecimal("0.05"), new BigDecimal("0.40"))),
        Map.entry("gpt-5-nano-low", new ChatModelPricing(new BigDecimal("0.05"), new BigDecimal("0.40"))),
        Map.entry("gpt-5-nano-medium", new ChatModelPricing(new BigDecimal("0.05"), new BigDecimal("0.40"))),
        Map.entry("gpt-5-nano-high", new ChatModelPricing(new BigDecimal("0.05"), new BigDecimal("0.40"))),
        Map.entry("gpt-5.5", new ChatModelPricing(new BigDecimal("5.00"), new BigDecimal("30.00"))),
        Map.entry("gpt-5.5-none", new ChatModelPricing(new BigDecimal("5.00"), new BigDecimal("30.00"))),
        Map.entry("gpt-5.5-low", new ChatModelPricing(new BigDecimal("5.00"), new BigDecimal("30.00"))),
        Map.entry("gpt-5.5-medium", new ChatModelPricing(new BigDecimal("5.00"), new BigDecimal("30.00"))),
        Map.entry("gpt-5.5-high", new ChatModelPricing(new BigDecimal("5.00"), new BigDecimal("30.00"))),
        Map.entry("gpt-5.5-xhigh", new ChatModelPricing(new BigDecimal("5.00"), new BigDecimal("30.00"))),
        // OpenAI GPT-5.6 family
        Map.entry("gpt-5.6-sol", new ChatModelPricing(new BigDecimal("5.00"), new BigDecimal("30.00"))),
        Map.entry("gpt-5.6-sol-none", new ChatModelPricing(new BigDecimal("5.00"), new BigDecimal("30.00"))),
        Map.entry("gpt-5.6-sol-low", new ChatModelPricing(new BigDecimal("5.00"), new BigDecimal("30.00"))),
        Map.entry("gpt-5.6-sol-medium", new ChatModelPricing(new BigDecimal("5.00"), new BigDecimal("30.00"))),
        Map.entry("gpt-5.6-sol-high", new ChatModelPricing(new BigDecimal("5.00"), new BigDecimal("30.00"))),
        Map.entry("gpt-5.6-sol-xhigh", new ChatModelPricing(new BigDecimal("5.00"), new BigDecimal("30.00"))),
        Map.entry("gpt-5.6-sol-max", new ChatModelPricing(new BigDecimal("5.00"), new BigDecimal("30.00"))),
        Map.entry("gpt-5.6-terra", new ChatModelPricing(new BigDecimal("2.50"), new BigDecimal("15.00"))),
        Map.entry("gpt-5.6-terra-none", new ChatModelPricing(new BigDecimal("2.50"), new BigDecimal("15.00"))),
        Map.entry("gpt-5.6-terra-low", new ChatModelPricing(new BigDecimal("2.50"), new BigDecimal("15.00"))),
        Map.entry("gpt-5.6-terra-medium", new ChatModelPricing(new BigDecimal("2.50"), new BigDecimal("15.00"))),
        Map.entry("gpt-5.6-terra-high", new ChatModelPricing(new BigDecimal("2.50"), new BigDecimal("15.00"))),
        Map.entry("gpt-5.6-terra-xhigh", new ChatModelPricing(new BigDecimal("2.50"), new BigDecimal("15.00"))),
        Map.entry("gpt-5.6-terra-max", new ChatModelPricing(new BigDecimal("2.50"), new BigDecimal("15.00"))),
        Map.entry("gpt-5.6-luna", new ChatModelPricing(new BigDecimal("1.00"), new BigDecimal("6.00"))),
        Map.entry("gpt-5.6-luna-none", new ChatModelPricing(new BigDecimal("1.00"), new BigDecimal("6.00"))),
        Map.entry("gpt-5.6-luna-low", new ChatModelPricing(new BigDecimal("1.00"), new BigDecimal("6.00"))),
        Map.entry("gpt-5.6-luna-medium", new ChatModelPricing(new BigDecimal("1.00"), new BigDecimal("6.00"))),
        Map.entry("gpt-5.6-luna-high", new ChatModelPricing(new BigDecimal("1.00"), new BigDecimal("6.00"))),
        Map.entry("gpt-5.6-luna-xhigh", new ChatModelPricing(new BigDecimal("1.00"), new BigDecimal("6.00"))),
        Map.entry("gpt-5.6-luna-max", new ChatModelPricing(new BigDecimal("1.00"), new BigDecimal("6.00"))),
        // Anthropic Claude
        Map.entry("claude-sonnet-4-5", new ChatModelPricing(new BigDecimal("3.00"), new BigDecimal("15.00"))),
        Map.entry("claude-haiku-4-5", new ChatModelPricing(new BigDecimal("1.00"), new BigDecimal("5.00"))),
        Map.entry("claude-opus-4-8", new ChatModelPricing(new BigDecimal("5.00"), new BigDecimal("25.00"))),
        Map.entry("claude-opus-4-8-low", new ChatModelPricing(new BigDecimal("5.00"), new BigDecimal("25.00"))),
        Map.entry("claude-opus-4-8-medium", new ChatModelPricing(new BigDecimal("5.00"), new BigDecimal("25.00"))),
        Map.entry("claude-opus-4-8-high", new ChatModelPricing(new BigDecimal("5.00"), new BigDecimal("25.00"))),
        Map.entry("claude-opus-4-8-xhigh", new ChatModelPricing(new BigDecimal("5.00"), new BigDecimal("25.00"))),
        Map.entry("claude-opus-4-8-max", new ChatModelPricing(new BigDecimal("5.00"), new BigDecimal("25.00"))),
        Map.entry("claude-sonnet-5", new ChatModelPricing(new BigDecimal("3.00"), new BigDecimal("15.00"))),
        Map.entry("claude-sonnet-5-low", new ChatModelPricing(new BigDecimal("3.00"), new BigDecimal("15.00"))),
        Map.entry("claude-sonnet-5-medium", new ChatModelPricing(new BigDecimal("3.00"), new BigDecimal("15.00"))),
        Map.entry("claude-sonnet-5-high", new ChatModelPricing(new BigDecimal("3.00"), new BigDecimal("15.00"))),
        Map.entry("claude-sonnet-5-xhigh", new ChatModelPricing(new BigDecimal("3.00"), new BigDecimal("15.00"))),
        Map.entry("claude-sonnet-5-max", new ChatModelPricing(new BigDecimal("3.00"), new BigDecimal("15.00"))),
        // Google Gemini
        Map.entry("gemini-3.1-pro-preview", new ChatModelPricing(new BigDecimal("2.00"), new BigDecimal("12.00"))),
        Map.entry("gemini-3.1-pro-preview-low", new ChatModelPricing(new BigDecimal("2.00"), new BigDecimal("12.00"))),
        Map.entry("gemini-3.1-pro-preview-medium", new ChatModelPricing(new BigDecimal("2.00"), new BigDecimal("12.00"))),
        Map.entry("gemini-3.1-pro-preview-high", new ChatModelPricing(new BigDecimal("2.00"), new BigDecimal("12.00"))),
        Map.entry("gemini-3-flash-preview", new ChatModelPricing(new BigDecimal("0.50"), new BigDecimal("3.00"))),
        Map.entry("gemini-3.5-flash", new ChatModelPricing(new BigDecimal("1.50"), new BigDecimal("9.00"))),
        Map.entry("gemini-3.5-flash-minimal", new ChatModelPricing(new BigDecimal("1.50"), new BigDecimal("9.00"))),
        Map.entry("gemini-3.5-flash-low", new ChatModelPricing(new BigDecimal("1.50"), new BigDecimal("9.00"))),
        Map.entry("gemini-3.5-flash-medium", new ChatModelPricing(new BigDecimal("1.50"), new BigDecimal("9.00"))),
        Map.entry("gemini-3.5-flash-high", new ChatModelPricing(new BigDecimal("1.50"), new BigDecimal("9.00")))
    );

    // OpenAI image models priced per quality variant at 1024x1024, derived from
    // OpenAI's token-based image pricing calculator.
    private static final Map<String, ImageModelPricing> IMAGE_MODEL_PRICING = Map.ofEntries(
        Map.entry("gpt-image-2-low", new ImageModelPricing(new BigDecimal("0.006"))),
        Map.entry("gpt-image-2-medium", new ImageModelPricing(new BigDecimal("0.053"))),
        Map.entry("gpt-image-2-high", new ImageModelPricing(new BigDecimal("0.211"))),
        // Ideogram 4.0 per-image pricing by rendering speed (Turbo / Default / Quality)
        Map.entry("ideogram-4-turbo", new ImageModelPricing(new BigDecimal("0.03"))),
        Map.entry("ideogram-4-default", new ImageModelPricing(new BigDecimal("0.06"))),
        Map.entry("ideogram-4-quality", new ImageModelPricing(new BigDecimal("0.10"))),
        // Gemini Developer API: 1,290 output tokens per 1024x1024 image at $30/M tokens
        Map.entry("gemini-3-pro-image-preview", new ImageModelPricing(new BigDecimal("0.134"))),
        // Gemini Developer API: 1,120 output tokens per 1K image at $60/M tokens
        Map.entry("gemini-3.1-flash-image", new ImageModelPricing(new BigDecimal("0.067")))
    );

    private static final Map<String, AudioModelPricing> AUDIO_MODEL_PRICING = Map.of(
        // ElevenLabs API pricing per 1000 characters
        "eleven_turbo_v2_5", new AudioModelPricing(new BigDecimal("0.05")),
        "eleven_v3", new AudioModelPricing(new BigDecimal("0.10")),
        // Gemini TTS is token-priced; approximated per 1000 characters
        "gemini-3.1-flash-tts-preview", new AudioModelPricing(new BigDecimal("0.02"))
    );

    public ChatModelPricing getChatModelPricing(String modelName) {
        return CHAT_MODEL_PRICING.getOrDefault(modelName,
            new ChatModelPricing(BigDecimal.ZERO, BigDecimal.ZERO));
    }

    public ImageModelPricing getImageModelPricing(String modelName) {
        return IMAGE_MODEL_PRICING.getOrDefault(modelName,
            new ImageModelPricing(BigDecimal.ZERO));
    }

    public AudioModelPricing getAudioModelPricing(String modelName) {
        return AUDIO_MODEL_PRICING.getOrDefault(modelName,
            new AudioModelPricing(BigDecimal.ZERO));
    }

    public BigDecimal calculateChatCost(String modelName, long inputTokens, long outputTokens) {
        ChatModelPricing pricing = getChatModelPricing(modelName);
        BigDecimal inputCost = pricing.inputPerMillion()
            .multiply(BigDecimal.valueOf(inputTokens))
            .divide(BigDecimal.valueOf(1_000_000), 6, java.math.RoundingMode.HALF_UP);
        BigDecimal outputCost = pricing.outputPerMillion()
            .multiply(BigDecimal.valueOf(outputTokens))
            .divide(BigDecimal.valueOf(1_000_000), 6, java.math.RoundingMode.HALF_UP);
        return inputCost.add(outputCost);
    }

    public BigDecimal calculateImageCost(String modelName, int imageCount) {
        ImageModelPricing pricing = getImageModelPricing(modelName);
        return pricing.perImage().multiply(BigDecimal.valueOf(imageCount));
    }

    public BigDecimal calculateAudioCost(String modelName, long characterCount) {
        AudioModelPricing pricing = getAudioModelPricing(modelName);
        return pricing.perThousandCharacters()
            .multiply(BigDecimal.valueOf(characterCount))
            .divide(BigDecimal.valueOf(1000), 6, java.math.RoundingMode.HALF_UP);
    }
}
