package io.github.mucsi96.learnlanguage.model;

import java.util.List;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;

public record ImageDescriptionsResponse(
    @JsonPropertyDescription("The requested number of distinct, self-contained English photorealistic scene descriptions.") List<String> descriptions) {
}
