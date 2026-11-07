package io.github.mucsi96.learnlanguage.service;

import java.nio.file.Files;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import com.azure.storage.blob.models.BlobItem;
import org.springframework.stereotype.Component;
import io.github.mucsi96.learnlanguage.model.ContentModels.*;
import io.github.mucsi96.learnlanguage.service.ContentAssetService;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;

@Component
@RequiredArgsConstructor
public class AudioCollectionService {
    private final ContentAssetService assets;

    public void validatePath(String path) {
        if (path == null || !path.matches("(?:[a-z0-9]+(?:-[a-z0-9]+)*/)+")) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Collection path must contain slug folders and end with / ");
        }
    }

    public List<ContentDescriptor> discoverContent(String collectionPath) {
        validatePath(collectionPath);
        final Set<String> names = assets.list(collectionPath).stream().map(BlobItem::getName).collect(Collectors.toUnmodifiableSet());
        final List<String> folders = names.stream().map(name -> name.substring(collectionPath.length()))
                .filter(name -> name.matches("[0-9]{3}-[a-z0-9]+(?:-[a-z0-9]+)*/(?:text\\.txt|audio\\.mp3)"))
                .map(name -> name.substring(0, name.indexOf('/'))).distinct().sorted().toList();
        if (folders.isEmpty()) throw new IllegalStateException("Azure story collection is empty");
        return folders.stream().map(folder -> {
            final String text = collectionPath + folder + "/text.txt";
            final String audio = collectionPath + folder + "/audio.mp3";
            if (!names.contains(text) || !names.contains(audio)) {
                throw new IllegalStateException("Story requires text.txt and audio.mp3: " + folder);
            }
            final String title = document(text).lines().findFirst().orElseThrow().strip();
            if (title.isBlank()) throw new IllegalStateException("Story title is empty: " + folder);
            return new ContentDescriptor(folder, title, Integer.valueOf(folder.substring(0, 3)), null,
                    null, audio, text, "text/plain", null);
        }).toList();
    }

    public String resolveTranscript(ContentDescriptor content) {
        final String document = document(content.transcriptUrl());
        final int newline = document.indexOf('\n');
        if (newline < 0 || !document.substring(0, newline).strip().equals(content.title())) {
            throw new IllegalStateException("Story text must start with its title");
        }
        final String transcript = document.substring(newline + 1).strip();
        if (transcript.isBlank()) throw new IllegalStateException("Story transcript is empty");
        return transcript;
    }

    @SneakyThrows
    private String document(String blob) {
        return Files.readString(assets.cached(blob));
    }
}
