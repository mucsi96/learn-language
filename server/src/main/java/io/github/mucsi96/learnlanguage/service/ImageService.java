package io.github.mucsi96.learnlanguage.service;

import java.util.Base64;

import org.springframework.ai.image.ImageGeneration;
import org.springframework.ai.image.ImageModel;
import org.springframework.ai.image.ImageOptions;
import org.springframework.ai.image.ImagePrompt;
import org.springframework.ai.image.ImageResponse;
import org.springframework.ai.openai.OpenAiImageOptions;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImageService {

    private final ImageModel imageModel;

    public byte[] generateImage(String input) {
        ImageOptions options = OpenAiImageOptions.builder()
            .withModel("dall-e-3")
            .withQuality("hd")
            .withStyle("natural")
            .height(1024)
            .width(1024)
            .withResponseFormat("b64_json")
            .build();

        ImagePrompt prompt = new ImagePrompt("Design a photorealistic, visually appealing, and modern image to illustrate the following example sentence: " + input, options);
        ImageResponse imageResponse = imageModel.call(prompt);
        ImageGeneration generation = imageResponse.getResult();
        return Base64.getDecoder().decode(generation.getOutput().getB64Json());
    }
}
