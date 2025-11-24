package io.github.mucsi96.learnlanguage.service;

import org.springframework.stereotype.Service;

import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.ImageConfig;
import com.google.genai.types.Part;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class NanoBananaProImageService {

  private static final String NANO_BANANA_PRO_MODEL = "gemini-3-pro-image-preview";

  private final Client googleAiClient;

  public byte[] generateImage(String prompt) {
    try {
      GenerateContentConfig config = GenerateContentConfig.builder()
          .responseModalities("TEXT", "IMAGE")
          .imageConfig(ImageConfig.builder()
              .aspectRatio("1:1")
              .imageSize("1K")
              .build())
          .build();

      GenerateContentResponse response = googleAiClient.models.generateContent(
          NANO_BANANA_PRO_MODEL,
          Content.fromParts(Part.fromText(prompt)),
          config);

      if (response.candidates().isEmpty() ||
          response.candidates().get().isEmpty() ||
          response.candidates().get().get(0).content().isEmpty() ||
          response.candidates().get().get(0).content().get().parts().isEmpty()) {
        throw new RuntimeException("No image generated from Nano Banana Pro API");
      }

      return response.candidates().get().get(0).content().get().parts().get()
          .stream()
          .filter(part -> part.inlineData().isPresent())
          .findFirst()
          .orElseThrow(() -> new RuntimeException("No image data found in response"))
          .inlineData().get().data().get();

    } catch (Exception e) {
      log.error("Failed to generate image with Nano Banana Pro", e);
      throw new RuntimeException("Failed to generate image with Nano Banana Pro: " + e.getMessage(), e);
    }
  }
}
