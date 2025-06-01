package io.github.mucsi96.learnlanguage.controller;

import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
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
       String uuid = UUID.randomUUID().toString();
        String blobName = String.format("images/%s.webp", uuid);

        if (!imageSource.isOverride() && blobStorageService.blobExists(blobName)) {
            return ImageResponse.builder()
                    .url(blobStorageService.getDownloadUrl(blobName))
                    .build();
        }

        byte[] data = imageService.generateImage(imageSource.getInput());
        blobStorageService.uploadBlob(BinaryData.fromBytes(data), blobName);

        String url = blobStorageService.getDownloadUrl(blobName);
        return ImageResponse.builder()
                .url(url)
                .build();
    }
}
