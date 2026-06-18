package io.github.mucsi96.learnlanguage.model;

import java.util.Arrays;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.RequiredArgsConstructor;

// Pricing: https://platform.openai.com/docs/pricing
//          https://ai.google.dev/gemini-api/docs/pricing
@RequiredArgsConstructor
public enum ImageGenerationModel {
    GPT_IMAGE_1_5_LOW("gpt-image-1.5-low", "gpt-image-1.5", "GPT Image 1.5 (Low)", ImageQuality.LOW),
    GPT_IMAGE_1_5_MEDIUM("gpt-image-1.5-medium", "gpt-image-1.5", "GPT Image 1.5 (Medium)", ImageQuality.MEDIUM),
    GPT_IMAGE_1_5_HIGH("gpt-image-1.5-high", "gpt-image-1.5", "GPT Image 1.5 (High)", ImageQuality.HIGH),
    GPT_IMAGE_2_LOW("gpt-image-2-low", "gpt-image-2", "GPT Image 2 (Low)", ImageQuality.LOW),
    GPT_IMAGE_2_MEDIUM("gpt-image-2-medium", "gpt-image-2", "GPT Image 2 (Medium)", ImageQuality.MEDIUM),
    GPT_IMAGE_2_HIGH("gpt-image-2-high", "gpt-image-2", "GPT Image 2 (High)", ImageQuality.HIGH),
    GEMINI_3_PRO_IMAGE_PREVIEW("gemini-3-pro-image-preview", "gemini-3-pro-image-preview", "Gemini 3 Pro", null);

    public enum ImageQuality {
        LOW, MEDIUM, HIGH
    }

    private final String id;
    private final String apiModelName;
    private final String displayName;
    private final ImageQuality quality;

    @JsonValue
    public String getModelName() {
        return id;
    }

    public String getApiModelName() {
        return apiModelName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public ImageQuality getQuality() {
        return quality;
    }

    @JsonCreator
    public static ImageGenerationModel fromString(String id) {
        return Arrays.stream(values())
            .filter(model -> model.id.equals(id))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Unknown image generation model: " + id));
    }
}
