package io.github.mucsi96.learnlanguage.service;

import java.util.Base64;

import org.springframework.stereotype.Service;

import com.openai.client.OpenAIClient;
import com.openai.models.images.ImageGenerateParams;
import com.openai.models.images.ImagesResponse;

import io.github.mucsi96.learnlanguage.model.ImageGenerationModel;
import io.github.mucsi96.learnlanguage.model.ImageGenerationModel.ImageQuality;
import io.github.mucsi96.learnlanguage.model.OperationType;
import io.github.mucsi96.learnlanguage.exception.ProviderBillingException;
import io.github.mucsi96.learnlanguage.model.ModelProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class OpenAIImageService {

    private final OpenAIClient openAIClient;
    private final ModelUsageLoggingService usageLoggingService;
    private final ProviderBillingIssueService billingIssueService;

    public byte[] generateImage(String input, ImageGenerationModel model) {
        final long startTime = System.currentTimeMillis();
        try {
            final ImageGenerateParams imageGenerateParams = ImageGenerateParams.builder()
                .prompt(ImagePromptBuilder.build(input))
                .model(model.getApiModelName())
                .size(ImageGenerateParams.Size._1024X1024)
                .quality(toQuality(model.getQuality()))
                .n(1)
                .outputFormat(ImageGenerateParams.OutputFormat.JPEG)
                .outputCompression(75)
                .build();

            final ImagesResponse response = openAIClient.images().generate(imageGenerateParams);
            final byte[] image = response.data().orElseThrow().stream()
                .flatMap(img -> img.b64Json().stream())
                .map(b64 -> Base64.getDecoder().decode(b64))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No image data returned from OpenAI API"));

            final long processingTime = System.currentTimeMillis() - startTime;
            if (model.getApiModelName().startsWith("gpt-image-2.5-")) {
                final ImagesResponse.Usage usage = response.usage().orElseThrow(
                    () -> new IllegalStateException("OpenAI did not return GPT Image 2.5 usage"));
                final ImagesResponse.Usage.InputTokensDetails inputTokens = usage.inputTokensDetails();
                usageLoggingService.logGptImage25Usage(
                    model.getModelName(),
                    OperationType.IMAGE_GENERATION,
                    1,
                    usage.inputTokens(),
                    inputTokens.textTokens(),
                    inputTokens.imageTokens(),
                    usage.outputTokens(),
                    processingTime);
            } else {
                usageLoggingService.logImageUsage(
                    model.getModelName(), OperationType.IMAGE_GENERATION, 1, processingTime);
            }

            return image;

        } catch (Exception e) {
            log.error("Failed to generate image with OpenAI", e);
            if (billingIssueService.recordFailure(ModelProvider.OPENAI, e)) {
                throw new ProviderBillingException(ModelProvider.OPENAI, e);
            }
            throw new RuntimeException("Failed to generate image with OpenAI: " + e.getMessage(), e);
        }
    }

    private ImageGenerateParams.Quality toQuality(ImageQuality quality) {
        return switch (quality) {
            case LOW -> ImageGenerateParams.Quality.LOW;
            case MEDIUM -> ImageGenerateParams.Quality.MEDIUM;
            case HIGH -> ImageGenerateParams.Quality.HIGH;
            case XHIGH -> ImageGenerateParams.Quality.of("xhigh");
            case MAX -> ImageGenerateParams.Quality.of("max");
            case AUTO -> ImageGenerateParams.Quality.AUTO;
        };
    }
}
