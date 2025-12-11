package io.github.mucsi96.learnlanguage.service;

import java.util.Base64;

import org.springframework.ai.image.ImageModel;
import org.springframework.ai.image.ImagePrompt;
import org.springframework.ai.openai.OpenAiImageOptions;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class OpenAIImageService {

    private final ImageModel imageModel;

    public byte[] generateImage(String prompt) {
        try {
            var options = OpenAiImageOptions.builder()
                .model("gpt-image-1")
                .width(1024)
                .height(1024)
                .quality("high")
                .responseFormat("b64_json")
                .build();

            var imagePrompt = new ImagePrompt(
                "Create a photorealistic image for the following context: " + prompt + ". Avoid using text.",
                options);

            var response = imageModel.call(imagePrompt);
            var imageB64 = response.getResult().getOutput().getB64Json();

            return Base64.getDecoder().decode(imageB64);

        } catch (Exception e) {
            log.error("Failed to generate image with OpenAI", e);
            throw new RuntimeException("Failed to generate image with OpenAI: " + e.getMessage(), e);
        }
    }
}
