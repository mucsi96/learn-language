package io.github.mucsi96.learnlanguage.service;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

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
      Use the variation cues to create a fresh interpretation, varying only details not specified \
      by the input. Preserve the meaning, action and all explicit context; these take priority \
      over any variation cue. Keep differences subtle and natural, not surreal. \
      The scene must not contain any text, letters, numbers, signs with writing or captions. \
      Always write the description in English, regardless of the language of the input. \
      Respond with the description only.""";

  private static final List<String> COMPOSITIONS = List.of(
      "an eye-level view with the main subject slightly off-center",
      "a three-quarter view showing the subject and its surroundings",
      "a closer view emphasizing the key action or object",
      "a wider view with a clear foreground and background",
      "a slightly elevated view with natural depth",
      "a low viewpoint with the main subject clearly visible");

  private static final List<String> LIGHTING = List.of(
      "soft, diffused light",
      "warm light with gentle shadows",
      "cool, even light",
      "subtle side lighting that reveals texture",
      "bright, clear light with natural contrast",
      "gentle backlighting with the subject well exposed");

  private static final List<String> BACKGROUNDS = List.of(
      "a simple, uncluttered background",
      "a softly blurred background with a few contextual details",
      "layered surroundings that add a sense of depth",
      "a few everyday objects that support the scene's meaning",
      "subtle natural textures in the surroundings",
      "contrasting colors that help the main subject stand out");

  private final OpenAIImageService openAIImageService;
  private final GoogleImageService googleImageService;
  private final IdeogramImageService ideogramImageService;
  private final ChatService chatService;
  private final ChatModelSettingService chatModelSettingService;

  public GeneratedImage generateImage(String input, String context, ImageGenerationModel model) {
    final String prompt = describeScene(input, context);

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

  private String describeScene(String input, String context) {
    final String descriptionInput = context == null || context.isBlank() ? input : context;
    final String variedInput = """
        Input:
        %s

        Variation cues:
        Composition: %s
        Lighting: %s
        Background: %s
        """.formatted(descriptionInput, pickVariation(COMPOSITIONS), pickVariation(LIGHTING),
            pickVariation(BACKGROUNDS));
    final String description = chatService.callForTextWithLogging(
        chatModelSettingService.getPrimaryModel(OperationType.IMAGE_DESCRIPTION),
        OperationType.IMAGE_DESCRIPTION,
        DESCRIPTION_SYSTEM_PROMPT,
        variedInput);
    log.info("Generated image description for input \"{}\": {}", descriptionInput, description);
    return description;
  }

  private static String pickVariation(List<String> variations) {
    return variations.get(ThreadLocalRandom.current().nextInt(variations.size()));
  }
}
