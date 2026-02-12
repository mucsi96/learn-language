package io.github.mucsi96.learnlanguage.service;

import java.util.List;
import java.util.stream.Stream;

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

  public record GeneratedImage(byte[] data, String modelDisplayName) {}

  public List<GeneratedImage> generateImages(String input) {
    final List<byte[]> openaiImages = openAIImageService.generateImages(input);
    final List<byte[]> geminiImages = googleImageService.generateImages(input);

    return Stream.concat(
        openaiImages.stream().map(img -> new GeneratedImage(img, ImageGenerationModel.GPT_IMAGE_1_5.getDisplayName())),
        geminiImages.stream().map(img -> new GeneratedImage(img, ImageGenerationModel.GEMINI_3_PRO_IMAGE_PREVIEW.getDisplayName()))
    ).toList();
  }
}
