package io.github.mucsi96.learnlanguage.service;

import java.util.Base64;
import java.util.List;

import org.springframework.stereotype.Service;

import com.openai.client.OpenAIClient;
import com.openai.models.images.ImageGenerateParams;

import io.github.mucsi96.learnlanguage.model.OperationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class OpenAIImageService {

    private static final String MODEL_NAME = "gpt-image-1.5";
    private static final int IMAGE_COUNT = 2;

    private final OpenAIClient openAIClient;
    private final ModelUsageLoggingService usageLoggingService;

    public List<byte[]> generateImages(String prompt) {
        final long startTime = System.currentTimeMillis();
        try {
            final ImageGenerateParams imageGenerateParams = ImageGenerateParams.builder()
                .prompt("Create a photorealistic image for the following context: " + prompt + ". Avoid using text.")
                .model(MODEL_NAME)
                .size(ImageGenerateParams.Size._1024X1024)
                .quality(ImageGenerateParams.Quality.HIGH)
                .n(IMAGE_COUNT)
                .outputFormat(ImageGenerateParams.OutputFormat.JPEG)
                .outputCompression(75)
                .build();

            final List<byte[]> images = openAIClient.images().generate(imageGenerateParams).data().orElseThrow().stream()
                .flatMap(image -> image.b64Json().stream())
                .map(b64 -> Base64.getDecoder().decode(b64))
                .toList();

            if (images.isEmpty()) {
                throw new RuntimeException("No image data returned from OpenAI API");
            }

            final long processingTime = System.currentTimeMillis() - startTime;
            usageLoggingService.logImageUsage(MODEL_NAME, OperationType.IMAGE_GENERATION, images.size(), processingTime);

            return images;

        } catch (Exception e) {
            log.error("Failed to generate images with OpenAI", e);
            throw new RuntimeException("Failed to generate images with OpenAI: " + e.getMessage(), e);
        }
    }
}
