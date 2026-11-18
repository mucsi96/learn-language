package io.github.mucsi96.learnlanguage.model;

import java.util.List;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TranslationResponse {
    @JsonPropertyDescription("Headword translation in the requested language and contextual sense.")
    private String translation;
    @JsonPropertyDescription("One translated sentence per input example, in the same order.")
    private List<String> examples;
}
