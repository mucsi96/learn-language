package io.github.mucsi96.learnlanguage.service;

import java.util.Base64;

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

    private final OpenAIClient openAIClient;
    private final ModelUsageLoggingService usageLoggingService;

    public byte[] generateImage(String input, String modelName) {
        final long startTime = System.currentTimeMillis();
        try {
            final ImageGenerateParams imageGenerateParams = ImageGenerateParams.builder()
                .prompt(ImagePromptBuilder.build(input))
                .model(modelName)
                .size(ImageGenerateParams.Size._1024X1024)
                .quality(ImageGenerateParams.Quality.HIGH)
                .n(1)
                .outputFormat(ImageGenerateParams.OutputFormat.JPEG)
                .outputCompression(75)
                .build();

            final byte[] image = openAIClient.images().generate(imageGenerateParams).data().orElseThrow().stream()
                .flatMap(img -> img.b64Json().stream())
                .map(b64 -> Base64.getDecoder().decode(b64))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No image data returned from OpenAI API"));

            final long processingTime = System.currentTimeMillis() - startTime;
            usageLoggingService.logImageUsage(modelName, OperationType.IMAGE_GENERATION, 1, processingTime);

            return image;

        } catch (Exception e) {
            log.error("Failed to generate image with OpenAI", e);
            throw new RuntimeException("Failed to generate image with OpenAI: " + e.getMessage(), e);
        }
    }
}
