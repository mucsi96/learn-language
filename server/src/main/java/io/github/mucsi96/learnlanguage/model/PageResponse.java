package io.github.mucsi96.learnlanguage.model;

import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PageResponse {
    private int number;
    private String sourceId;
    private String sourceName;
    private List<Span> spans;

    @Data
    @Builder
    public static class Span {
        private String id;
        private boolean exists;
    }
}
