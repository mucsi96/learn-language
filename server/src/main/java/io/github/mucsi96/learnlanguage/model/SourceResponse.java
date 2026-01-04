package io.github.mucsi96.learnlanguage.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SourceResponse {
    private String id;
    private String name;
    private String fileName;
    private Integer startPage;
    private Integer cardCount;
    private SourceFormatType formatType;
}
