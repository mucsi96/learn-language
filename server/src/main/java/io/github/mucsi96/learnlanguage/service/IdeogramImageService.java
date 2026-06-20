package io.github.mucsi96.learnlanguage.service;

import java.net.URI;
import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import io.github.mucsi96.learnlanguage.model.ImageGenerationModel;
import io.github.mucsi96.learnlanguage.model.ImageGenerationModel.ImageQuality;
import io.github.mucsi96.learnlanguage.model.OperationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class IdeogramImageService {

    private final RestClient ideogramRestClient;
    private final ModelUsageLoggingService usageLoggingService;

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record IdeogramImage(String url) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record IdeogramResponse(List<IdeogramImage> data) {
    }

    public byte[] generateImage(String input, ImageGenerationModel model) {
        final long startTime = System.currentTimeMillis();
        try {
            final MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
            form.add("text_prompt", ImagePromptBuilder.build(input));
            form.add("rendering_speed", toRenderingSpeed(model.getQuality()));
            form.add("resolution", "2048x2048");
            form.add("num_images", "1");

            final IdeogramResponse response = ideogramRestClient.post()
                .uri("/v1/" + model.getApiModelName() + "/generate")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(form)
                .retrieve()
                .body(IdeogramResponse.class);

            final String imageUrl = response.data().stream()
                .map(IdeogramImage::url)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No image returned from Ideogram API"));

            final byte[] image = ideogramRestClient.get()
                .uri(URI.create(imageUrl))
                .retrieve()
                .body(byte[].class);

            final long processingTime = System.currentTimeMillis() - startTime;
            usageLoggingService.logImageUsage(model.getModelName(), OperationType.IMAGE_GENERATION, 1, processingTime);

            return image;

        } catch (Exception e) {
            log.error("Failed to generate image with Ideogram", e);
            throw new RuntimeException("Failed to generate image with Ideogram: " + e.getMessage(), e);
        }
    }

    private String toRenderingSpeed(ImageQuality quality) {
        return switch (quality) {
            case LOW -> "TURBO";
            case MEDIUM -> "DEFAULT";
            case HIGH -> "QUALITY";
        };
    }
}
