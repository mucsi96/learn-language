package io.github.mucsi96.learnlanguage.extension;

import java.text.Normalizer;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import io.github.mucsi96.learnlanguage.model.ContentModels.*;
import io.github.mucsi96.learnlanguage.service.ContentAssetService;
import tools.jackson.databind.json.JsonMapper;
import lombok.SneakyThrows;

@Component
public class EinfachDeutschLernenExtension implements SourceExtension {
    private static final String PLAYER = "div[class*=VideoPlayer][aria-label]";
    private static final String TEXT = "h1,h2,h3,h4,h5,h6,p";
    private final ContentAssetService assets;
    private final String indexUrl;
    private final Map<String, StoryRecording> recordings;

    @SneakyThrows
    public EinfachDeutschLernenExtension(ContentAssetService assets, JsonMapper json,
            @Value("${extensions.einfach-deutsch-lernen.index:https://www.einfachdeutschlernen.com/en/niveau-a1-a2}") String indexUrl,
            @Value("${extensions.einfach-deutsch-lernen.recordings:classpath:source-extensions/einfach-deutsch-a1-a2.json}") Resource recordings) {
        this.assets = assets;
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
        final var page = Jsoup.parse(assets.text(indexUrl), indexUrl);
        final var stories = page.select("h6").stream().flatMap(heading -> heading.parents().stream()
                .filter(parent -> parent.select("h6").size() == 1)
                .flatMap(parent -> parent.select("a[href]").stream())
                .filter(link -> link.absUrl("href").matches(".*geschichten-?a1-a2-g\\d+(?:#.*)?$"))
                .map(link -> content(heading.text(), link.absUrl("href"))).findFirst().stream()).distinct().toList();
        if (stories.isEmpty()) throw new IllegalStateException("The A1–A2 index contains no story links");
        return stories;
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
        final var page = Jsoup.parse(assets.text(content.transcriptUrl()));
        final List<String> transcripts = page.select(PLAYER).stream()
                .flatMap(player -> player.parents().stream()
                        .filter(parent -> parent.select(PLAYER).size() == 1 && !parent.select(TEXT).isEmpty())
                        .findFirst().stream())
                .filter(section -> key(section.selectFirst(TEXT).text()).equals(key(recording.transcriptTitle())))
                .map(this::storyText).distinct().toList();
        if (transcripts.size() != 1) throw new IllegalStateException("Story text is missing or ambiguous: " + content.title());
        return new ResolvedTranscript(transcripts.getFirst(), null, "text/plain");
    }

    private String storyText(Element section) {
        final var paragraphs = section.select(TEXT).stream().map(Element::text)
                .takeWhile(line -> !line.matches("(?i)Vokabeln|Wortschatz|Fragen(?: zum Text)?")
                        && !line.startsWith("Wir würden uns sehr darüber freuen"))
                .filter(line -> !line.isBlank()).toList();
        if (paragraphs.size() < 2) throw new IllegalStateException("Story text is incomplete");
        return String.join("\n", paragraphs);
    }

    private static String key(String title) {
        return Normalizer.normalize(title, Normalizer.Form.NFKC).toLowerCase(Locale.GERMAN)
                .replaceAll("[^\\p{L}\\p{N}]", "");
    }
}
