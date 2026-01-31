package io.github.mucsi96.learnlanguage.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SourceResponse {
    private String id;
    private String name;
    private SourceType sourceType;
    private CardType cardType;
    private Integer startPage;
    private Integer pageCount;
    private Integer cardCount;
    private LanguageLevel languageLevel;
    private SourceFormatType formatType;
}
