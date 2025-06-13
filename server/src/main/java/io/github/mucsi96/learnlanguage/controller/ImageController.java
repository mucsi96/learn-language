package io.github.mucsi96.learnlanguage.controller;

import java.util.UUID;

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
import io.github.mucsi96.learnlanguage.service.BlobStorageService;
import io.github.mucsi96.learnlanguage.service.ImageResizeService;
import io.github.mucsi96.learnlanguage.service.ImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

@RestController
@RequiredArgsConstructor
public class ImageController {

    private final BlobStorageService blobStorageService;
    private final ImageService imageService;
    private final ImageResizeService imageResizeService;

    @PostMapping("/api/image")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ExampleImageData createImage(@RequestBody ImageSourceRequest imageSource) {
       String uuid = UUID.randomUUID().toString();
        String blobName = String.format("images/%s.webp", uuid);

        byte[] data = imageService.generateImage(imageSource.getInput());
        blobStorageService.uploadBlob(BinaryData.fromBytes(data), blobName);

        return ExampleImageData.builder()
                .id(uuid)
                .build();
    }

    @GetMapping(value = "/api/image/{id}", produces = "image/webp")
    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    public ResponseEntity<byte[]> getCachedResizedImage(
            @PathVariable String id,
            @RequestParam int width,
            @RequestParam int height) throws Exception {
        String blobName = String.format("images/%s.webp", id);
        byte[] original = blobStorageService.fetchBlob(blobName).toBytes();
        byte[] resized = imageResizeService.resizeImage(original, width, height, blobName);
        return ResponseEntity.ok()
                .contentType(MediaType.valueOf("image/webp"))
                .header("Cache-Control", "public, max-age=31536000, immutable")
                .body(resized);
    }
}
