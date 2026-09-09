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
    GPT_IMAGE_2_5_SUNBURST_LOW("gpt-image-2.5-sunburst-low", "gpt-image-2.5-sunburst", "GPT Image 2.5 Sunburst (Low)", ImageQuality.LOW, null),
    GPT_IMAGE_2_5_SUNBURST_MEDIUM("gpt-image-2.5-sunburst-medium", "gpt-image-2.5-sunburst", "GPT Image 2.5 Sunburst (Medium)", ImageQuality.MEDIUM, null),
    GPT_IMAGE_2_5_SUNBURST_HIGH("gpt-image-2.5-sunburst-high", "gpt-image-2.5-sunburst", "GPT Image 2.5 Sunburst (High)", ImageQuality.HIGH, null),
    GPT_IMAGE_2_5_SUNBURST_XHIGH("gpt-image-2.5-sunburst-xhigh", "gpt-image-2.5-sunburst", "GPT Image 2.5 Sunburst (XHigh)", ImageQuality.XHIGH, null),
    GPT_IMAGE_2_5_SUNBURST_MAX("gpt-image-2.5-sunburst-max", "gpt-image-2.5-sunburst", "GPT Image 2.5 Sunburst (Max)", ImageQuality.MAX, null),
    GPT_IMAGE_2_5_SUNBURST_AUTO("gpt-image-2.5-sunburst-auto", "gpt-image-2.5-sunburst", "GPT Image 2.5 Sunburst (Auto)", ImageQuality.AUTO, null),
    GPT_IMAGE_2_5_FLARE_LOW("gpt-image-2.5-flare-low", "gpt-image-2.5-flare", "GPT Image 2.5 Flare (Low)", ImageQuality.LOW, null),
    GPT_IMAGE_2_5_FLARE_MEDIUM("gpt-image-2.5-flare-medium", "gpt-image-2.5-flare", "GPT Image 2.5 Flare (Medium)", ImageQuality.MEDIUM, null),
    GPT_IMAGE_2_5_FLARE_HIGH("gpt-image-2.5-flare-high", "gpt-image-2.5-flare", "GPT Image 2.5 Flare (High)", ImageQuality.HIGH, null),
    GPT_IMAGE_2_5_FLARE_XHIGH("gpt-image-2.5-flare-xhigh", "gpt-image-2.5-flare", "GPT Image 2.5 Flare (XHigh)", ImageQuality.XHIGH, null),
    GPT_IMAGE_2_5_FLARE_MAX("gpt-image-2.5-flare-max", "gpt-image-2.5-flare", "GPT Image 2.5 Flare (Max)", ImageQuality.MAX, null),
    GPT_IMAGE_2_5_FLARE_AUTO("gpt-image-2.5-flare-auto", "gpt-image-2.5-flare", "GPT Image 2.5 Flare (Auto)", ImageQuality.AUTO, null),
    IDEOGRAM_4_TURBO("ideogram-4-turbo", "ideogram-v4", "Ideogram 4 (Turbo)", ImageQuality.LOW, "2048x2048"),
    IDEOGRAM_4_DEFAULT("ideogram-4-default", "ideogram-v4", "Ideogram 4 (Default)", ImageQuality.MEDIUM, "2048x2048"),
    IDEOGRAM_4_QUALITY("ideogram-4-quality", "ideogram-v4", "Ideogram 4 (Quality)", ImageQuality.HIGH, "2048x2048"),
    GEMINI_3_PRO_IMAGE_PREVIEW("gemini-3-pro-image-preview", "gemini-3-pro-image-preview", "Gemini 3 Pro", null, null);

    public enum ImageQuality {
        LOW, MEDIUM, HIGH, XHIGH, MAX, AUTO
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
