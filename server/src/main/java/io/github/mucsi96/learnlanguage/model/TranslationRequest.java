package io.github.mucsi96.learnlanguage.model;

import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TranslationRequest {
    private List<String> examples;
    private String word;
}
