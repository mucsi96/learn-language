package io.github.mucsi96.learnlanguage.extension;

import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import io.github.mucsi96.learnlanguage.model.ContentModels.*;

@Component
@Profile("test")
public class FixtureSourceExtension implements SourceExtension {
    @Override
    public ExtensionDescriptor descriptor() {
        return new ExtensionDescriptor("text-fixture", "Text fixture", "Texts", List.of("browse", "vocabulary"));
    }

    @Override
    public java.time.Duration discoveryInterval() {
        return java.time.Duration.ofDays(1);
    }

    @Override
    public List<ContentDescriptor> discoverContent() {
        return List.of(new ContentDescriptor("house-text", "Ein gutes Haus", null, null, "A1", null,
                "http://localhost:3070/content-fixtures/story.txt", "text/plain", null, null));
    }
}
