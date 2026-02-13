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

  public List<byte[]> generateImages(String input, ImageGenerationModel model) {
    return switch (model) {
      case GPT_IMAGE_1_5 -> openAIImageService.generateImages(input, model.getImageCount());
      case GEMINI_3_PRO_IMAGE_PREVIEW -> googleImageService.generateImages(input, model.getImageCount());
    };
  }
}
