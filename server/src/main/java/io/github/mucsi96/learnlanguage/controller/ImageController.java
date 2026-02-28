package io.github.mucsi96.learnlanguage.controller;

import java.util.UUID;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.azure.core.util.BinaryData;

import io.github.mucsi96.learnlanguage.model.ExampleImageData;
import io.github.mucsi96.learnlanguage.model.ImageSourceRequest;
import io.github.mucsi96.learnlanguage.service.FileStorageService;
import io.github.mucsi96.learnlanguage.service.ImageResizeService;
import io.github.mucsi96.learnlanguage.service.ImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

@RestController
@RequiredArgsConstructor
public class ImageController {

  private final FileStorageService fileStorageService;
  private final ImageService imageService;
  private final ImageResizeService imageResizeService;

  private static final int MAX_IMAGE_DIMENSION = 1200;
  private static final String IMAGE_WEBP_VALUE = "image/webp";
  private static final MediaType IMAGE_WEBP = MediaType.parseMediaType(IMAGE_WEBP_VALUE);

  @PostMapping("/image")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ExampleImageData createImage(@Valid @RequestBody ImageSourceRequest imageSource) {
    final String displayName = imageSource.getModel().getDisplayName();
    final byte[] data = imageService.generateImage(imageSource.getInput(), imageSource.getModel());
    final String uuid = UUID.randomUUID().toString();
    final String filePath = "images/%s.webp".formatted(uuid);
    try {
      final byte[] compressed = imageResizeService.resizeImage(
          data, MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, filePath);
      fileStorageService.saveFile(BinaryData.fromBytes(compressed), filePath);
    } catch (Exception e) {
      throw new RuntimeException("Failed to compress image: " + e.getMessage(), e);
    }
    return ExampleImageData.builder()
        .id(uuid)
        .model(displayName)
        .build();
  }

  @GetMapping(value = "/image/{id}", produces = IMAGE_WEBP_VALUE)
  @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
  public ResponseEntity<byte[]> getCachedResizedImage(
      @PathVariable String id,
      @RequestParam int width,
      @RequestParam int height) throws Exception {
    final String filePath = "images/%s.webp".formatted(id);
    final byte[] original = fileStorageService.fetchFile(filePath).toBytes();
    final byte[] resized = imageResizeService.resizeImage(original, width, height, filePath);
    return ResponseEntity.ok()
        .contentType(IMAGE_WEBP)
        .header("Cache-Control", "public, max-age=31536000, immutable")
        .body(resized);
  }
}
