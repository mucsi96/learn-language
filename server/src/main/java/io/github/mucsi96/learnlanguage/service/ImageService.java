package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.model.GeneratedImage;
import io.github.mucsi96.learnlanguage.model.ImageGenerationModel;
import io.github.mucsi96.learnlanguage.model.OperationType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImageService {

  private static final String DESCRIPTION_SYSTEM_PROMPT = """
      You are an expert prompt writer for image generation models. \
      Given a word or sentence, write a detailed visual description of a single photorealistic scene \
      that illustrates its meaning. Describe the concrete objects and people that are visible, \
      their positions and spatial relationships, the setting, lighting and mood. \
      Use simple, unambiguous language an image model can follow. \
      The scene must not contain any text, letters, numbers, signs with writing or captions. \
      Always write the description in English, regardless of the language of the input. \
      Respond with the description only.""";

  private final OpenAIImageService openAIImageService;
  private final GoogleImageService googleImageService;
  private final IdeogramImageService ideogramImageService;
  private final ChatService chatService;
  private final ChatModelSettingService chatModelSettingService;

  public GeneratedImage generateImage(String input, String context, ImageGenerationModel model) {
    final String prompt = describeScene(input, context);

    final byte[] data = switch (model) {
      case GPT_IMAGE_2_LOW, GPT_IMAGE_2_MEDIUM, GPT_IMAGE_2_HIGH ->
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

  private String describeScene(String input, String context) {
    final String descriptionInput = context == null || context.isBlank() ? input : context;
    final String description = chatService.callForTextWithLogging(
        chatModelSettingService.getPrimaryModel(OperationType.IMAGE_DESCRIPTION),
        OperationType.IMAGE_DESCRIPTION,
        DESCRIPTION_SYSTEM_PROMPT,
        descriptionInput);
    log.info("Generated image description for input \"{}\": {}", descriptionInput, description);
    return description;
  }
}
