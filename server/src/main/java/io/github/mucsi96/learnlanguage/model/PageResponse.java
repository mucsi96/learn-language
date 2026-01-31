package io.github.mucsi96.learnlanguage.model;

import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PageResponse {
    private int number;
    private double width;
    private double height;
    private String sourceId;
    private String sourceName;
    private SourceType sourceType;
    private CardType cardType;
    private SourceFormatType formatType;
    private Boolean hasImage;
    private List<Span> spans;

    @Data
    @Builder
    public static class Span {
        private String text;
        private String searchTerm;
        private Bbox bbox;

        @Data
        @Builder
        public static class Bbox {
            private double x;
            private double y;
            private double width;
            private double height;
        }
    }
}
