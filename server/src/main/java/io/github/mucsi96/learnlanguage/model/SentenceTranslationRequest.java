package io.github.mucsi96.learnlanguage.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SentenceTranslationRequest {
    private String sentence;
}
