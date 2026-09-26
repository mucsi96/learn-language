package io.github.mucsi96.learnlanguage.extension;

import java.text.Normalizer;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import io.github.mucsi96.learnlanguage.model.ContentModels.*;
import io.github.mucsi96.learnlanguage.service.SourceContentExtractionService;
import tools.jackson.databind.json.JsonMapper;
import lombok.SneakyThrows;

@Component
public class EinfachDeutschLernenExtension implements SourceExtension {
    private final SourceContentExtractionService extraction;
    private final String indexUrl;
    private final Map<String, StoryRecording> recordings;

    @SneakyThrows
    public EinfachDeutschLernenExtension(SourceContentExtractionService extraction, JsonMapper json,
            @Value("${extensions.einfach-deutsch-lernen.index:https://www.einfachdeutschlernen.com/en/niveau-a1-a2}") String indexUrl,
            @Value("${extensions.einfach-deutsch-lernen.recordings:classpath:source-extensions/einfach-deutsch-a1-a2.json}") Resource recordings) {
        this.extraction = extraction;
        this.indexUrl = indexUrl;
        try (final var input = recordings.getInputStream()) {
            this.recordings = Arrays.stream(json.readValue(input, StoryRecording[].class))
                    .peek(recording -> {
                        if (!recording.videoId().matches("[A-Za-z0-9_-]{11}")) {
                            throw new IllegalArgumentException("Invalid recording ID: " + recording.title());
                        }
                    }).collect(Collectors.toUnmodifiableMap(recording -> key(recording.title()), Function.identity()));
        }
    }

    @Override
    public ExtensionDescriptor descriptor() {
        return new ExtensionDescriptor("einfach-deutsch-a1-a2", "Deutsch lernen durch Hören A1–A2", "Stories",
                List.of("browse", "vocabulary", "listen"));
    }

    @Override
    public Duration discoveryInterval() { return Duration.ofHours(24); }

    @Override
    public List<ContentDescriptor> discoverContent() {
        return extraction.discoverStories(indexUrl, "Deutsch lernen durch Hören: German stories at A1–A2 level")
                .stream().map(story -> content(story.title(), story.url())).toList();
    }

    private ContentDescriptor content(String title, String pageUrl) {
        final StoryRecording recording = recordings.get(key(title));
        if (recording == null) {
            return new ContentDescriptor(key(title), title, null, null, "A1-A2", null, pageUrl, "text/html",
                    "This new story's embedded recording has not been verified yet", null);
        }
        return new ContentDescriptor(recording.videoId(), title, recording.number(), recording.durationSeconds(),
                "A1-A2", null, pageUrl, "text/html", recording.transcriptIssue(), recording.videoId());
    }

    @Override
    public ResolvedTranscript resolveTranscript(ContentDescriptor content) {
        final StoryRecording recording = recordings.get(key(content.title()));
        if (recording == null || recording.transcriptIssue() != null) {
            throw new IllegalStateException("The story needs a verified transcript and recording");
        }
        return new ResolvedTranscript(extraction.extractStory(content.transcriptUrl(), recording.transcriptTitle()), null, "text/plain");
    }

    private static String key(String title) {
        return Normalizer.normalize(title, Normalizer.Form.NFKC).toLowerCase(Locale.GERMAN)
                .replaceAll("[^\\p{L}\\p{N}]", "");
    }
}
