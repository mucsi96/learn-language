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
  private final NanoBananaProImageService nanoBananaProImageService;

  public byte[] generateImage(String input, ImageGenerationModel model) {
    if (model == ImageGenerationModel.GPT_IMAGE_1) {
      return openAIImageService.generateImage(input);
    } else if (model == ImageGenerationModel.NANO_BANANA_PRO) {
      return nanoBananaProImageService.generateImage(input);
    } else {
      return googleImageService.generateImage(input);
    }
  }
}
