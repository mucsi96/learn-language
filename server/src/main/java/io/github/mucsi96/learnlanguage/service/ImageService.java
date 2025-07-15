package io.github.mucsi96.learnlanguage.service;

import java.util.Base64;

import org.springframework.stereotype.Service;

import com.openai.client.OpenAIClient;
import com.openai.models.images.ImageGenerateParams;
import com.openai.models.images.ImageModel;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImageService {

  private final OpenAIClient openAIClient;

  public byte[] generateImage(String input) {
    ImageGenerateParams imageGenerateParams = ImageGenerateParams.builder()
        .prompt(
            "Create a visually striking, photorealistic, and easy-to-remember flashcard image that clearly illustrates the situation described in the following sentence—without including any text on the image: "
                + input)
        .model(ImageModel.GPT_IMAGE_1)
        .size(ImageGenerateParams.Size._1024X1024)
        .quality(ImageGenerateParams.Quality.HIGH)
        .n(1)
        .outputFormat(ImageGenerateParams.OutputFormat.JPEG)
        .outputCompression(75)
        .build();

    var imageB64Json = openAIClient.images().generate(imageGenerateParams).data().orElseThrow().stream()
        .flatMap(image -> image.b64Json().stream())
        .findFirst()
        .orElseThrow(() -> new RuntimeException("No image data returned from OpenAI API"));

    return Base64.getDecoder().decode(imageB64Json);
  }
}
