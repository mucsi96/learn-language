package io.github.mucsi96.learnlanguage.service;

import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.model.GeneratedImage;
import io.github.mucsi96.learnlanguage.model.ImageGenerationModel;
import io.github.mucsi96.learnlanguage.model.ImageDescriptionsResponse;
import io.github.mucsi96.learnlanguage.model.OperationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImageService {

  private static final String DESCRIPTION_SYSTEM_PROMPT = """
      You are an expert prompt writer for image generation models. \
      Given an input and a count, generate exactly that many fundamentally different scene ideas \
      illustrating the input's meaning. Maximize conceptual diversity across the entire set: \
      explore different situations, subjects, interactions, actions and ways to express the concept, \
      wherever the input leaves room. Do not reuse one scenario with different lighting, \
      backgrounds, camera angles or wording. Compare the ideas before answering and replace \
      near-duplicates with genuinely different scenarios. \
      Every scene must independently preserve the meaning and all explicit details of the input. \
      For a narrowly specified context, explore the most different plausible situations within \
      those constraints rather than contradicting them. \
      Write each idea as a self-contained, detailed visual description of one photorealistic scene. \
      Describe visible objects and people, their actions and spatial relationships, and the setting. \
      Use concrete, unambiguous language an image model can follow without seeing the other descriptions. \
      The scenes must not contain any text, letters, numbers, signs with writing or captions. \
      Always write the descriptions in English, regardless of the language of the input.""";

  private final OpenAIImageService openAIImageService;
  private final GoogleImageService googleImageService;
  private final IdeogramImageService ideogramImageService;
  private final ChatService chatService;
  private final ChatModelSettingService chatModelSettingService;

  public GeneratedImage generateImage(String prompt, ImageGenerationModel model) {
    final byte[] data = switch (model) {
      case GPT_IMAGE_2_LOW, GPT_IMAGE_2_MEDIUM, GPT_IMAGE_2_HIGH,
          GPT_IMAGE_2_5_SUNBURST_LOW, GPT_IMAGE_2_5_SUNBURST_MEDIUM,
          GPT_IMAGE_2_5_SUNBURST_HIGH, GPT_IMAGE_2_5_SUNBURST_XHIGH,
          GPT_IMAGE_2_5_SUNBURST_MAX, GPT_IMAGE_2_5_SUNBURST_AUTO,
          GPT_IMAGE_2_5_FLARE_LOW, GPT_IMAGE_2_5_FLARE_MEDIUM,
          GPT_IMAGE_2_5_FLARE_HIGH, GPT_IMAGE_2_5_FLARE_XHIGH,
          GPT_IMAGE_2_5_FLARE_MAX, GPT_IMAGE_2_5_FLARE_AUTO ->
        openAIImageService.generateImage(prompt, model);
      case IDEOGRAM_4_TURBO, IDEOGRAM_4_DEFAULT, IDEOGRAM_4_QUALITY ->
        ideogramImageService.generateImage(prompt, model);
      case GEMINI_3_PRO_IMAGE_PREVIEW ->
        googleImageService.generateGeminiImage(prompt, model);
    };

    return GeneratedImage.builder()
        .data(data)
        .build();
  }

  public ImageDescriptionsResponse describeScenes(String input, String context, int count) {
    final String descriptionInput = context == null || context.isBlank() ? input : context;
    final ImageDescriptionsResponse result = chatService.callWithLogging(
        chatModelSettingService.getPrimaryModel(OperationType.IMAGE_DESCRIPTION),
        OperationType.IMAGE_DESCRIPTION,
        DESCRIPTION_SYSTEM_PROMPT,
        "Count: %d\nInput:\n%s".formatted(count, descriptionInput),
        ImageDescriptionsResponse.class);
    final List<String> descriptions = result.descriptions();
    if (descriptions == null || descriptions.size() != count
        || descriptions.stream().anyMatch(description -> description == null || description.isBlank())
        || descriptions.stream().map(description -> description.strip().toLowerCase(Locale.ROOT))
            .distinct().count() != count) {
      throw new IllegalStateException(
          "Image description model must return exactly " + count + " distinct, nonblank descriptions");
    }
    log.info("Generated {} image descriptions for input \"{}\": {}", count, descriptionInput, descriptions);
    return new ImageDescriptionsResponse(List.copyOf(descriptions));
  }
}
