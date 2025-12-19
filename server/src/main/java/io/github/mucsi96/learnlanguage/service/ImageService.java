package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import io.github.mucsi96.learnlanguage.model.ImageGenerationModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImageService {
  private final OpenAIImageService openAIImageService;
  private final GoogleImageService googleImageService;

  public byte[] generateImage(String input, ImageGenerationModel model) {
    return switch (model) {
      case GPT_IMAGE_1 -> openAIImageService.generateImage(input);
      case GPT_IMAGE_1_5 -> openAIImageService.generateImageWithModel15(input);
      case IMAGEN_4_ULTRA -> googleImageService.generateImageWithImagen(input);
      case NANO_BANANA_PRO -> googleImageService.generateImageWithNanoBananaPro(input);
    };
  }
}
