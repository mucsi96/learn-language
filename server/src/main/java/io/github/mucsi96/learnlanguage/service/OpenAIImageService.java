package io.github.mucsi96.learnlanguage.service;

import java.util.Base64;

import org.springframework.stereotype.Service;

import com.openai.client.OpenAIClient;
import com.openai.models.images.ImageGenerateParams;
import com.openai.models.images.ImageModel;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class OpenAIImageService {

    private final OpenAIClient openAIClient;
    private final ModelUsageLoggingService usageLoggingService;

    public byte[] generateImage(String prompt) {
        return generateImageWithModel(prompt, ImageModel.GPT_IMAGE_1, "gpt-image-1");
    }

    public byte[] generateImageWithModel15(String prompt) {
        return generateImageWithModel(prompt, ImageModel.GPT_IMAGE_1_5, "gpt-image-1.5");
    }

    private byte[] generateImageWithModel(String prompt, ImageModel model, String modelName) {
        long startTime = System.currentTimeMillis();
        try {
            ImageGenerateParams imageGenerateParams = ImageGenerateParams.builder()
                .prompt("Create a photorealistic image for the following context: " + prompt + ". Avoid using text.")
                .model(model)
                .size(ImageGenerateParams.Size._1024X1024)
                .quality(ImageGenerateParams.Quality.HIGH)
                .n(1)
                .outputFormat(ImageGenerateParams.OutputFormat.JPEG)
                .outputCompression(75)
                .build();

            var imageB64Json = openAIClient.images().generate(imageGenerateParams).data().orElseThrow().stream()
                .flatMap(image -> image.b64Json().stream())
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No image data returned from OpenAI API"));

            long processingTime = System.currentTimeMillis() - startTime;
            usageLoggingService.logImageUsage(modelName, "image_generation", 1, processingTime);

            return Base64.getDecoder().decode(imageB64Json);

        } catch (Exception e) {
            log.error("Failed to generate image with OpenAI", e);
            throw new RuntimeException("Failed to generate image with OpenAI: " + e.getMessage(), e);
        }
    }
}
