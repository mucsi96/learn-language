package io.github.mucsi96.learnlanguage.model;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class HighlightResponse {
    Integer id;
    String candidateCardId;
    boolean cardExists;
    String highlightedWord;
    String sentence;
    LocalDateTime createdAt;
}
