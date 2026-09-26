package io.github.mucsi96.learnlanguage.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;

@Service
@RequiredArgsConstructor
public class ContentAssetService {
    private final FileStorageService storage;
    private final HttpClient client = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(20)).build();

    @SneakyThrows
    public String text(String url) {
        final var response = client.send(request(url), HttpResponse.BodyHandlers.ofString());
        requireSuccess(response.statusCode());
        return response.body();
    }

    @SneakyThrows
    public Path cached(String url) {
        final Path target = storage.resolveFilePath("content-assets/" + key(url));
        if (Files.isRegularFile(target)) return target;
        Files.createDirectories(target.getParent());
        final Path temporary = Files.createTempFile(target.getParent(), "download-", ".tmp");
        try {
            final var response = client.send(request(url), HttpResponse.BodyHandlers.ofFile(temporary));
            requireSuccess(response.statusCode());
            if (Files.size(temporary) == 0) throw new IllegalStateException("Downloaded asset is empty");
            Files.move(temporary, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            return target;
        } finally {
            Files.deleteIfExists(temporary);
        }
    }

    private HttpRequest request(String url) {
        final URI uri = URI.create(url);
        if (!java.util.Set.of("https", "http").contains(uri.getScheme())) {
            throw new IllegalArgumentException("Unsupported asset scheme");
        }
        return HttpRequest.newBuilder(uri).timeout(Duration.ofMinutes(3))
                .header("User-Agent", "LearnLanguage/1.0").GET().build();
    }

    private void requireSuccess(int status) {
        if (status < 200 || status >= 300) throw new IllegalStateException("Content provider returned HTTP " + status);
    }

    @SneakyThrows
    public static String key(String value) {
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
