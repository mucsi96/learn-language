package io.github.mucsi96.learnlanguage.model;

import java.util.Arrays;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.RequiredArgsConstructor;

// Pricing: https://platform.openai.com/docs/pricing
//          https://ai.google.dev/gemini-api/docs/pricing
@RequiredArgsConstructor
public enum ImageGenerationModel {
    GPT_IMAGE_1_5("gpt-image-1.5", "GPT Image 1.5"),
    GPT_IMAGE_2("gpt-image-2", "GPT Image 2"),
    GEMINI_3_PRO_IMAGE_PREVIEW("gemini-3-pro-image-preview", "Gemini 3 Pro");

    private final String modelName;
    private final String displayName;

    @JsonValue
    public String getModelName() {
        return modelName;
    }

    public String getDisplayName() {
        return displayName;
    }

    @JsonCreator
    public static ImageGenerationModel fromString(String modelName) {
        return Arrays.stream(values())
            .filter(model -> model.modelName.equals(modelName))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Unknown image generation model: " + modelName));
    }
}
