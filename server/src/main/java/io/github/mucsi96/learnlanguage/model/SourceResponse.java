package io.github.mucsi96.learnlanguage.model;

import java.util.Map;

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
    private Integer draftCardCount;
    private Integer flaggedCardCount;
    private Integer unhealthyCardCount;
    private Integer suggestedKnownCardCount;
    private Map<String, Integer> stateCounts;
    private Map<String, Integer> readinessCounts;
    private LanguageLevel languageLevel;
    private SourceFormatType formatType;
    private Integer cardLimit;
    private Integer newCardLimit;
}
