package io.github.mucsi96.learnlanguage.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.azure.core.util.BinaryData;

import io.github.mucsi96.learnlanguage.model.ImageResponse;
import io.github.mucsi96.learnlanguage.model.ImageSourceRequest;
import io.github.mucsi96.learnlanguage.service.BlobStorageService;
import io.github.mucsi96.learnlanguage.service.ImageService;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class ImageController {

    private final BlobStorageService blobStorageService;
    private final ImageService imageService;

    @PostMapping("/api/image/{source}")
    @PreAuthorize("hasAuthority('APPROLE_DeckCreator') and hasAuthority('SCOPE_createDeck')")
    public ImageResponse createImage(@PathVariable String source, @RequestBody ImageSourceRequest imageSource) {
        String blobName = String.format("images/%s/%s-%d.png", source, imageSource.getId(), imageSource.getIndex());

        if (!imageSource.isOverride() && blobStorageService.blobExists(blobName)) {
            return ImageResponse.builder()
                    .url(blobStorageService.getDownloadUrl(blobName))
                    .build();
        }

        byte[] data = imageService.generateImage(imageSource.getInput());
        blobStorageService.uploadBlob(BinaryData.fromBytes(data), blobName);

        return ImageResponse.builder()
                .url(blobStorageService.getDownloadUrl(blobName))
                .build();
    }

    @GetMapping("/api/image/{source}/{imageId}")
    @PreAuthorize("hasAuthority('APPROLE_DeckReader') and hasAuthority('SCOPE_readDecks')")
    public ImageResponse getImage(@PathVariable String source, @PathVariable String imageId) {
        String url = blobStorageService.getDownloadUrl(String.format("images/%s/%s.png", source, imageId));
        return ImageResponse.builder()
                .url(url)
                .build();
    }
}
