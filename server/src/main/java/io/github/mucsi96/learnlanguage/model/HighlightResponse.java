package io.github.mucsi96.learnlanguage.model;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HighlightResponse {
    private Integer id;
    private String highlightedWord;
    private String sentence;
    private LocalDateTime createdAt;
}
