package io.github.mucsi96.learnlanguage.model;

import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PageResponse {
    private int number;
    private float height;
    private String sourceId;
    private String sourceName;
    private List<Span> spans;

    @Data
    @Builder
    public static class Span {
        private String id;
        private String text;
        private boolean exists;
        private Bbox bbox;

        @Data
        @Builder
        public static class Bbox {
            private float x;
            private float y;
            private float width;
            private float height;
        }
    }
}
