package io.github.mucsi96.learnlanguage.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.google.genai.Client;
import com.google.genai.types.GenerateImagesConfig;
import com.google.genai.types.GenerateImagesResponse;
import com.google.genai.types.Image;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class GoogleImageService {

    private static final String IMAGEN_MODEL = "imagen-4.0-ultra-generate-001";

    @Value("${google.ai.apiKey}")
    private String apiKey;

    public byte[] generateImage(String prompt) {
        try {
            Client client = Client.builder().apiKey(apiKey).build();

            // client.models.list(null).forEach(model -> System.out.println(model.name().get()));

            GenerateImagesConfig generateImagesConfig = GenerateImagesConfig.builder()
                .numberOfImages(1)
                .outputMimeType("image/jpeg")
                .build();

            GenerateImagesResponse generatedImagesResponse = client.models.generateImages(
                IMAGEN_MODEL,
                prompt,
                generateImagesConfig
            );

            if (generatedImagesResponse.generatedImages().isEmpty() ||
                generatedImagesResponse.generatedImages().get().isEmpty()) {
                throw new RuntimeException("No image generated from Google Imagen API");
            }

            Image generatedImage = generatedImagesResponse.generatedImages().get().get(0).image().get();

            return generatedImage.imageBytes().get();

        } catch (Exception e) {
            log.error("Failed to generate image with Google Imagen", e);
            throw new RuntimeException("Failed to generate image with Google Imagen: " + e.getMessage(), e);
        }
    }
}
