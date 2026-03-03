package io.github.mucsi96.learnlanguage.model;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Source;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UnhealthyCardResponse {

    private String id;
    private CardResponse.CardSourceResponse source;
    private Integer sourcePageNumber;
    private CardData data;
    private String missingFields;

    public static UnhealthyCardResponse from(Card card, String missingFields) {
        final Source source = card.getSource();
        return UnhealthyCardResponse.builder()
                .id(card.getId())
                .source(CardResponse.CardSourceResponse.builder()
                        .id(source.getId())
                        .name(source.getName())
                        .sourceType(source.getSourceType())
                        .startPage(source.getStartPage())
                        .bookmarkedPage(source.getBookmarkedPage())
                        .languageLevel(source.getLanguageLevel())
                        .cardType(source.getCardType())
                        .formatType(source.getFormatType())
                        .build())
                .sourcePageNumber(card.getSourcePageNumber())
                .data(card.getData())
                .missingFields(missingFields)
                .build();
    }
}
