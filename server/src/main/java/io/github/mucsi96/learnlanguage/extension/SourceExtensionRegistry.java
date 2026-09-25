package io.github.mucsi96.learnlanguage.extension;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import io.github.mucsi96.learnlanguage.model.ContentModels.ExtensionDescriptor;

@Component
public class SourceExtensionRegistry {
    private final Map<String, SourceExtension> extensions;

    public SourceExtensionRegistry(List<SourceExtension> extensions) {
        this.extensions = extensions.stream().collect(Collectors.toUnmodifiableMap(
                extension -> extension.descriptor().id(), Function.identity()));
    }

    public SourceExtension require(String id) {
        if (id == null || !extensions.containsKey(id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown source extension: " + id);
        }
        return extensions.get(id);
    }

    public List<ExtensionDescriptor> descriptors() {
        return extensions.values().stream().map(SourceExtension::descriptor)
                .sorted(java.util.Comparator.comparing(ExtensionDescriptor::name)).toList();
    }
}
