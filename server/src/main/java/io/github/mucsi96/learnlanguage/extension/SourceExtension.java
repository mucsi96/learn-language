package io.github.mucsi96.learnlanguage.extension;

import java.util.List;
import io.github.mucsi96.learnlanguage.model.ContentModels.*;

public interface SourceExtension {
    ExtensionDescriptor descriptor();
    List<ContentDescriptor> discoverContent();
    java.time.Duration discoveryInterval();
    default ResolvedTranscript resolveTranscript(ContentDescriptor content) {
        return new ResolvedTranscript(null, content.transcriptUrl(), content.transcriptMediaType());
    }
    default IsolationPolicy isolationPolicy() {
        return new IsolationPolicy(List.of(), null);
    }
}
