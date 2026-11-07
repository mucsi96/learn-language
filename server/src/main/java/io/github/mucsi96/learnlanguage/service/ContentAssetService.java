package io.github.mucsi96.learnlanguage.service;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.List;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.models.BlobItem;
import com.azure.storage.blob.models.ListBlobsOptions;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;

@Service
@RequiredArgsConstructor
public class ContentAssetService {
    private final FileStorageService storage;
    private final BlobContainerClient storyContainer;

    public List<BlobItem> list(String prefix) {
        return storyContainer.listBlobs(new ListBlobsOptions().setPrefix(prefix), Duration.ofSeconds(30))
                .stream().toList();
    }

    public String text(String name) {
        return storyContainer.getBlobClient(name).downloadContent().toString();
    }

    @SneakyThrows
    public Path cached(String name) {
        if (!name.matches("(?:[a-z0-9]+(?:-[a-z0-9]+)*/)+[0-9]{3}-[a-z0-9]+(?:-[a-z0-9]+)*/(?:text\\.txt|audio\\.mp3)")) {
            throw new IllegalArgumentException("Invalid story blob name");
        }
        final Path target = storage.resolveFilePath("content-assets/" + key(storyContainer.getBlobContainerUrl() + "/" + name));
        if (Files.isRegularFile(target)) return target;
        Files.createDirectories(target.getParent());
        final Path temporary = Files.createTempFile(target.getParent(), "download-", ".tmp");
        try {
            try (final var output = Files.newOutputStream(temporary)) {
                storyContainer.getBlobClient(name).downloadStream(output);
            }
            if (Files.size(temporary) == 0) throw new IllegalStateException("Story asset is empty");
            Files.move(temporary, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            return target;
        } finally {
            Files.deleteIfExists(temporary);
        }
    }

    @SneakyThrows
    private static String key(String value) {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    }

    @SneakyThrows
    public String revision(Path asset) {
        final var digest = MessageDigest.getInstance("SHA-256");
        try (final var input = new java.security.DigestInputStream(Files.newInputStream(asset), digest)) {
            input.transferTo(java.io.OutputStream.nullOutputStream());
        }
        return HexFormat.of().formatHex(digest.digest());
    }
}
