package io.github.mucsi96.learnlanguage.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class CardResponse extends CardData {
    private String readiness;

    public static CardResponse fromCardData(CardData cardData, String readiness) {
        return CardResponse.builder()
            .word(cardData.getWord())
            .type(cardData.getType())
            .gender(cardData.getGender())
            .translation(cardData.getTranslation())
            .forms(cardData.getForms())
            .examples(cardData.getExamples())
            .readiness(readiness)
            .build();
    }
}
