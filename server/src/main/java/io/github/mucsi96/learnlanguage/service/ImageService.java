package io.github.mucsi96.learnlanguage.service;

import java.util.List;

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
  private final ImageModelSettingService imageModelSettingService;

  public List<byte[]> generateImages(String input, ImageGenerationModel model) {
    final int imageCount = imageModelSettingService.getImageCount(model);
    return switch (model) {
      case GPT_IMAGE_1_5 -> openAIImageService.generateImages(input, imageCount);
      case GEMINI_3_1_PRO_IMAGE_PREVIEW -> googleImageService.generateImages(input, imageCount);
    };
  }
}
