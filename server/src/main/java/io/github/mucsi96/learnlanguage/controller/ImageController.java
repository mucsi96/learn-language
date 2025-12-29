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

  @PostMapping("/image")
  @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
  public ExampleImageData createImage(@Valid @RequestBody ImageSourceRequest imageSource) {
    String uuid = UUID.randomUUID().toString();
    String filePath = "images/%s.jpg".formatted(uuid);

    byte[] data = imageService.generateImage(imageSource.getInput(), imageSource.getModel());
    fileStorageService.saveFile(BinaryData.fromBytes(data), filePath);

    return ExampleImageData.builder()
        .id(uuid)
        .model(imageSource.getModel().getDisplayName())
        .build();
  }

  @GetMapping(value = "/image/{id}", produces = MediaType.IMAGE_JPEG_VALUE)
  @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
  public ResponseEntity<byte[]> getCachedResizedImage(
      @PathVariable String id,
      @RequestParam int width,
      @RequestParam int height) throws Exception {
    String filePath = "images/%s.jpg".formatted(id);
    byte[] original = fileStorageService.fetchFile(filePath).toBytes();
    byte[] resized = imageResizeService.resizeImage(original, width, height, filePath);
    return ResponseEntity.ok()
        .contentType(MediaType.IMAGE_JPEG)
        .header("Cache-Control", "public, max-age=31536000, immutable")
        .body(resized);
  }
}
