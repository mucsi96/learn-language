package io.github.mucsi96.learnlanguage.model;

import java.util.Arrays;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.RequiredArgsConstructor;

// Pricing: https://platform.openai.com/docs/pricing
//          https://ai.google.dev/gemini-api/docs/pricing
@RequiredArgsConstructor
public enum ImageGenerationModel {
    GPT_IMAGE_2_LOW("gpt-image-2-low", "gpt-image-2", "GPT Image 2 (Low)", ImageQuality.LOW, null),
    GPT_IMAGE_2_MEDIUM("gpt-image-2-medium", "gpt-image-2", "GPT Image 2 (Medium)", ImageQuality.MEDIUM, null),
    GPT_IMAGE_2_HIGH("gpt-image-2-high", "gpt-image-2", "GPT Image 2 (High)", ImageQuality.HIGH, null),
    IDEOGRAM_4_TURBO("ideogram-4-turbo", "ideogram-v4", "Ideogram 4 (Turbo)", ImageQuality.LOW, "2048x2048"),
    IDEOGRAM_4_DEFAULT("ideogram-4-default", "ideogram-v4", "Ideogram 4 (Default)", ImageQuality.MEDIUM, "2048x2048"),
    IDEOGRAM_4_QUALITY("ideogram-4-quality", "ideogram-v4", "Ideogram 4 (Quality)", ImageQuality.HIGH, "2048x2048"),
    GEMINI_3_PRO_IMAGE_PREVIEW("gemini-3-pro-image-preview", "gemini-3-pro-image-preview", "Gemini 3 Pro", null, null);

    public enum ImageQuality {
        LOW, MEDIUM, HIGH
    }

    private final String id;
    private final String apiModelName;
    private final String displayName;
    private final ImageQuality quality;
    private final String resolution;

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

    public String getResolution() {
        return resolution;
    }

    @JsonCreator
    public static ImageGenerationModel fromString(String id) {
        return Arrays.stream(values())
            .filter(model -> model.id.equals(id))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Unknown image generation model: " + id));
    }
}
