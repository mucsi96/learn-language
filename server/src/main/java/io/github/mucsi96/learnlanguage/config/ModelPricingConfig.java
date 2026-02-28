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
        Map.entry("gpt-5-nano", new ChatModelPricing(new BigDecimal("0.05"), new BigDecimal("0.40"))),
        // Anthropic Claude
        Map.entry("claude-sonnet-4-5", new ChatModelPricing(new BigDecimal("3.00"), new BigDecimal("15.00"))),
        Map.entry("claude-haiku-4-5", new ChatModelPricing(new BigDecimal("0.80"), new BigDecimal("4.00"))),
        // Google Gemini
        Map.entry("gemini-3.1-pro-preview", new ChatModelPricing(new BigDecimal("2.00"), new BigDecimal("12.00"))),
        Map.entry("gemini-3-flash-preview", new ChatModelPricing(new BigDecimal("0.50"), new BigDecimal("3.00")))
    );

    private static final Map<String, ImageModelPricing> IMAGE_MODEL_PRICING = Map.of(
        // OpenAI image models (1024x1024 high quality)
        "gpt-image-1.5", new ImageModelPricing(new BigDecimal("0.133")),
        // Gemini Developer API: 1,290 output tokens per 1024x1024 image at $30/M tokens
        "gemini-3-pro-image-preview", new ImageModelPricing(new BigDecimal("0.039"))
    );

    private static final Map<String, AudioModelPricing> AUDIO_MODEL_PRICING = Map.of(
        // ElevenLabs (approximately $0.20 per 1000 characters)
        "eleven_turbo_v2_5", new AudioModelPricing(new BigDecimal("0.20")),
        "eleven_v3", new AudioModelPricing(new BigDecimal("0.20"))
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
