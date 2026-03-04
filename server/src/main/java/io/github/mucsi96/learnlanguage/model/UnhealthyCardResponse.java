package io.github.mucsi96.learnlanguage.model;

import io.github.mucsi96.learnlanguage.entity.Card;
import io.github.mucsi96.learnlanguage.entity.Source;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UnhealthyCardResponse {

    private String id;
    private String word;
    private UnhealthyCardSource source;
    private String missingFields;

    @Data
    @Builder
    public static class UnhealthyCardSource {
        private String id;
        private String name;
        private CardType cardType;
    }

    public static UnhealthyCardResponse from(Card card, String missingFields) {
        final Source source = card.getSource();
        return UnhealthyCardResponse.builder()
                .id(card.getId())
                .word(card.getData() != null ? card.getData().getWord() : null)
                .source(UnhealthyCardSource.builder()
                        .id(source.getId())
                        .name(source.getName())
                        .cardType(source.getCardType())
                        .build())
                .missingFields(missingFields)
                .build();
    }
}
