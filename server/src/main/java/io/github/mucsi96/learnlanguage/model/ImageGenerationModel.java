package io.github.mucsi96.learnlanguage.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import lombok.RequiredArgsConstructor;

// Pricing: https://platform.openai.com/docs/pricing
//          https://ai.google.dev/gemini-api/docs/pricing
@RequiredArgsConstructor
public enum ImageGenerationModel {
    GPT_IMAGE_1("gpt-image-1"),
    GPT_IMAGE_1_5("gpt-image-1.5"),
    IMAGEN_4_ULTRA("imagen-4.0-ultra"),
    GEMINI_3_PRO_IMAGE_PREVIEW("gemini-3-pro-image-preview");

    private final String modelName;

    @JsonValue
    public String getModelName() {
        return modelName;
    }

    @JsonCreator
    public static ImageGenerationModel fromString(String modelName) {
        for (ImageGenerationModel model : values()) {
            if (model.modelName.equals(modelName)) {
                return model;
            }
        }
        throw new IllegalArgumentException("Unknown image generation model: " + modelName);
    }
}
