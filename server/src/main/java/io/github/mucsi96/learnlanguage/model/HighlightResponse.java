package io.github.mucsi96.learnlanguage.model;

import java.time.LocalDateTime;

import lombok.Value;

@Value(staticConstructor = "of")
public class HighlightResponse {
    Integer id;
    String highlightedWord;
    String sentence;
    LocalDateTime createdAt;
}
